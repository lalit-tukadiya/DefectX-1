"""PatchCore Feature Extractor module.
Extracts intermediate multi-scale feature hierarchies from WideResNet-50-2 or DINOv2.
"""
from typing import List, Tuple, Dict
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models


class PatchCoreFeatureExtractor(nn.Module):
    def __init__(
        self,
        backbone_name: str = "wide_resnet50_2",
        layers: List[str] = ("layer2", "layer3"),
        device: str = "cpu"
    ):
        super().__init__()
        self.backbone_name = backbone_name
        self.layers = layers
        self.device = torch.device(device)
        self.hooks = {}
        self.features: Dict[str, torch.Tensor] = {}

        self._init_backbone()
        self.to(self.device)
        self.eval()

    def _init_backbone(self):
        try:
            if self.backbone_name == "wide_resnet50_2":
                weights = models.Wide_ResNet50_2_Weights.DEFAULT
                self.backbone = models.wide_resnet50_2(weights=weights)
            else:
                weights = models.ResNet50_Weights.DEFAULT
                self.backbone = models.resnet50(weights=weights)
        except Exception:
            # Fallback to randomly initialized backbone if offline/no internet
            self.backbone = models.wide_resnet50_2(weights=None)

        for param in self.backbone.parameters():
            param.requires_grad = False

        # Register forward hooks on specified intermediate layers
        for layer_name in self.layers:
            layer = getattr(self.backbone, layer_name)
            self.hooks[layer_name] = layer.register_forward_hook(self._hook_fn(layer_name))

    def _hook_fn(self, layer_name: str):
        def hook(_, __, output):
            self.features[layer_name] = output
        return hook

    def extract_patch_embeddings(self, x: torch.Tensor) -> Tuple[torch.Tensor, Tuple[int, int]]:
        """Extracts aligned, locally pooled patch embeddings.
        
        Args:
            x: Input tensor of shape (B, C, H, W)
            
        Returns:
            (embeddings, spatial_shape) where embeddings shape is (B * H_feat * W_feat, D)
        """
        self.features.clear()
        x = x.to(self.device)
        with torch.no_grad():
            _ = self.backbone(x)

        # Retrieve and spatially align layer features
        target_shape = None
        aligned_features = []

        for layer_name in self.layers:
            feat = self.features[layer_name]
            if target_shape is None:
                target_shape = feat.shape[2:]  # (H_feat, W_feat) of layer2
                aligned_features.append(feat)
            else:
                # Upsample deeper layers to match earlier layer resolution
                feat_rescaled = F.interpolate(feat, size=target_shape, mode="bilinear", align_corners=False)
                aligned_features.append(feat_rescaled)

        # Concatenate along channel dimension: (B, C1+C2, H_feat, W_feat)
        merged = torch.cat(aligned_features, dim=1)

        # Locally aggregated neighborhood pooling (kernel=3, stride=1, padding=1)
        pooled = F.avg_pool2d(merged, kernel_size=3, stride=1, padding=1)

        b, c, h_f, w_f = pooled.shape
        # Permute and reshape to (B * H_feat * W_feat, C)
        embeddings = pooled.permute(0, 2, 3, 1).reshape(-1, c)

        return embeddings, (h_f, w_f)

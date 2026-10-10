"""Memory Bank construction and nearest-neighbor anomaly scoring.
Includes Greedy Coreset Subsampling via Johnson-Lindenstrauss random projection.
"""
import os
import math
from typing import Tuple, Optional
import torch
import torch.nn.functional as F


class PatchCoreMemoryBank:
    def __init__(self, coreset_ratio: float = 0.05, projection_dim: int = 128, device: str = "cpu"):
        self.coreset_ratio = coreset_ratio
        self.projection_dim = projection_dim
        self.device = torch.device(device)
        self.memory_bank: Optional[torch.Tensor] = None  # (M, D)
        self.version: str = "1.0.0"

    def subsample_coreset(self, features: torch.Tensor) -> torch.Tensor:
        """Applies greedy minimax facility location to select representative patch features."""
        n_samples, feat_dim = features.shape
        target_size = max(10, int(math.ceil(n_samples * self.coreset_ratio)))

        if target_size >= n_samples:
            return features.clone()

        features = features.to(self.device)

        # Johnson-Lindenstrauss Random Projection for fast distance approximation
        torch.manual_seed(42)
        proj_matrix = torch.randn(feat_dim, self.projection_dim, device=self.device)
        proj_features = torch.matmul(features, proj_matrix)  # (N, proj_dim)

        selected_indices = []
        # Step 1: Select first index randomly or via centroid approximation
        first_idx = int(torch.randint(0, n_samples, (1,)).item())
        selected_indices.append(first_idx)

        # Initialize minimum distances from each point to the selected set
        dist = torch.cdist(proj_features, proj_features[first_idx:first_idx+1]).squeeze(1)

        # Iteratively select the point furthest from current coreset
        for _ in range(1, target_size):
            furthest_idx = int(torch.argmax(dist).item())
            selected_indices.append(furthest_idx)
            # Update minimum distances
            new_dist = torch.cdist(proj_features, proj_features[furthest_idx:furthest_idx+1]).squeeze(1)
            dist = torch.minimum(dist, new_dist)

        selected_idx_tensor = torch.tensor(selected_indices, dtype=torch.long, device=self.device)
        return features[selected_idx_tensor].cpu()

    def build(self, all_patch_features: torch.Tensor, version: str = "1.0.0"):
        """Constructs and stores the coreset memory bank."""
        self.memory_bank = self.subsample_coreset(all_patch_features)
        self.version = version

    def compute_anomaly_scores(
        self,
        test_patches: torch.Tensor,
        spatial_shape: Tuple[int, int],
        k_neighbors: int = 3
    ) -> Tuple[float, torch.Tensor]:
        """Computes nearest neighbor patch distance and aggregates image/pixel scores.
        
        Returns:
            (image_anomaly_score, pixel_anomaly_map_of_shape_H_feat_W_feat)
        """
        if self.memory_bank is None or len(self.memory_bank) == 0:
            h_f, w_f = spatial_shape
            return 0.0, torch.zeros((h_f, w_f))

        test_patches = test_patches.to(self.device)
        mb = self.memory_bank.to(self.device)

        # Pairwise Euclidean distances: (N_test, M)
        dists = torch.cdist(test_patches, mb)  # shape (N_test, M)
        
        # Nearest neighbor distances and indices
        topk_dists, topk_indices = torch.topk(dists, k=k_neighbors, largest=False, dim=1)
        nn_dists = topk_dists[:, 0]  # Nearest neighbor distance s(p)

        # Density re-weighting factor: soft-max weights over top-k distances
        # Prevents sparse normal regions from artificially inflating anomaly score
        weights = 1.0 - (torch.exp(nn_dists) / (torch.sum(torch.exp(topk_dists), dim=1) + 1e-6))
        patch_scores = weights * nn_dists

        # Image-level score: maximum patch score
        image_score = float(torch.max(patch_scores).item())

        # Reshape to spatial patch grid (H_feat, W_feat)
        h_f, w_f = spatial_shape
        anomaly_map = patch_scores.reshape(h_f, w_f).cpu()

        return image_score, anomaly_map

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save({
            "memory_bank": self.memory_bank,
            "version": self.version,
            "coreset_ratio": self.coreset_ratio,
            "projection_dim": self.projection_dim
        }, filepath)

    def load(self, filepath: str):
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Memory bank file not found: {filepath}")
        data = torch.load(filepath, map_location="cpu")
        self.memory_bank = data["memory_bank"]
        self.version = data.get("version", "1.0.0")
        self.coreset_ratio = data.get("coreset_ratio", 0.05)
        self.projection_dim = data.get("projection_dim", 128)

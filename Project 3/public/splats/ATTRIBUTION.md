# Viewer lab test splat

`soar.ply`: "SOAR Telescope" Gaussian splat by Luis Cerda
([khyron/Gaussian-Splatting](https://github.com/khyron/Gaussian-Splatting), release
[1.0](https://github.com/khyron/Gaussian-Splatting/releases/tag/1.0)), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). It shows the SOAR telescope on Cerro
Pachón, Chile.

Changes: format conversion only. The original `soar.compressed.ply` (SuperSplat compressed PLY,
12,273,900 bytes, SHA-256 `0f78dc6e0e150c6e1363556b1e9e99709e8be0eeac0329a930ee5d3f25159842`)
was converted to a standard 3DGS PLY (200,258 splats, spherical harmonics degree 3,
47,262,365 bytes, SHA-256 `caeb8fc5c819895c787a46b67600d3dafd46164317c413d8c769acc4e53fced7`)
with:

```powershell
npx @playcanvas/splat-transform@3.10.3 soar.compressed.ply soar.ply
```

import importlib.util
from pathlib import Path
import numpy as np
spec=importlib.util.spec_from_file_location('peaks',Path('scripts/prepare-waveform-peaks.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
peaks=np.zeros((65,4),dtype='<f4');peaks[3,1]=.999999;peaks[64,2]=-.987654
for group in [2,4,16,128]:
 reduced=module.reduce_peaks(peaks,group)
 assert reduced[:,1].max()==peaks[3,1]
 assert reduced[:,2].min()==peaks[64,2]
 assert np.isfinite(reduced).all()
 reduced=module.reduce_peaks(reduced,4)
 assert reduced[:,1].max()==peaks[3,1] and reduced[:,2].min()==peaks[64,2]
print('PASS native-float waveform pyramid: positive/negative single-bin peaks, incomplete final bucket and multiple resolution levels preserve extrema exactly.')

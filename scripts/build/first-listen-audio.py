"""Render the original 12-second homepage instrumental with two loudness-matched EQs."""
from pathlib import Path
import re, subprocess, sys, tempfile, wave
import numpy as np

output = Path(sys.argv[1])
output.mkdir(parents=True, exist_ok=True)
scratch = tempfile.TemporaryDirectory()
root = Path(scratch.name)
rate, beat = 32000, .75
length = 16 * beat
mix = np.zeros((int(rate * length), 2))
rng = np.random.default_rng(902)

def add(sound, start, pan=0):
    idx = (np.arange(len(sound)) + round(start * rate)) % len(mix)
    mix[idx, 0] += sound * np.sqrt((1-pan)/2)
    mix[idx, 1] += sound * np.sqrt((1+pan)/2)

def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)

def keys(note, start, strength, pan):
    t = np.arange(int(rate * 1.75)) / rate
    phase = 2*np.pi*frequency(note)*t
    sound = np.sin(phase + 1.5*np.exp(-6*t)*np.sin(phase*2)) + .25*np.sin(2.002*phase)
    env = (1-np.exp(-110*t))*np.exp(-2.8*t) * np.minimum(1,(t[-1]-t)/.1)
    add(.15*strength*env*sound, start, pan)
    add(.022*strength*env*sound, start + beat*.75, -pan)

for bar, (bass, chord) in enumerate([(38,[53,57,60,64]),(43,[53,57,59,64]),(36,[52,55,59,62]),(41,[52,55,57,60])]):
    for offset, vel in [(0,1), (1.55,.66), (2.75,.8)]:
        for i,n in enumerate(chord):
            keys(n, (4*bar+offset)*beat+i*.012, vel, (i-1.5)*.3)
    for offset, n, duration in [(0,bass,.82),(1.48,bass+12,.48),(2,bass+7,.71),(3.45,bass+10,.43)]:
        t = np.arange(round(rate*beat*duration))/rate
        p = 2*np.pi*frequency(n)*t
        env = np.minimum(1,t/.012)*np.minimum(1,(t[-1]-t)/.09)*np.exp(-1.4*t)
        add(.36*env*(np.sin(p)+.24*np.sin(2*p)+.08*np.sin(3*p)), (4*bar+offset)*beat)
    for offset in [0,2,2.76]:
        t = np.arange(round(.33*rate))/rate
        add(.57*np.minimum(1,t/.002)*np.exp(-15*t)*np.sin(2*np.pi*(48*t+3.3*(1-np.exp(-33*t)))), (bar*4+offset)*beat)
    for offset in [1,3]:
        t = np.arange(round(.23*rate))/rate
        noise = rng.normal(0,1,len(t))
        snap = .19*np.diff(noise, prepend=0)*np.exp(-31*t)+.19*np.sin(2*np.pi*182*t)*np.exp(-24*t)
        add(snap*np.minimum(1,t/.002), (bar*4+offset)*beat+.008,-.1)
    for i in range(8):
        t = np.arange(round(rate*.11))/rate
        bright = np.diff(rng.normal(0,1,len(t)), prepend=0)
        add((.053 if i%2 else .033)*bright*np.exp(-50*t)*np.minimum(1,t/.001), (bar*4+i*.5)*beat+(.022 if i%2 else 0), .42)

freq = np.fft.rfftfreq(len(mix),1/rate)
spectrum = np.fft.rfft(mix,axis=0)
tilt = 3.5 / (1 + (freq/270)**3) - 3.5 / (1 + (2600/np.maximum(freq,1))**3)
def write(path, samples):
    with wave.open(str(path),'wb') as f:
        f.setparams((2,2,rate,len(samples),'NONE','not compressed'))
        f.writeframes((samples.clip(-1,1)*32767).round().astype('<i2').tobytes())
def loudness(path):
    p = subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(path),'-af','ebur128','-f','null','-'],capture_output=True,text=True,check=True)
    return float(re.findall(r'I:\s+(-?\d+\.\d) LUFS',p.stderr)[-1])
for name,sign in [('a',1),('b',-1)]:
    audio = np.fft.irfft(spectrum*(10**(sign*tilt/20))[:,None],axis=0)
    audio = audio*.8/np.max(np.abs(audio))
    path=root/('sound-'+name+'.wav')
    write(path,audio)
    audio *= 10**((-21-loudness(path))/20)
    write(path,audio)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-map_metadata', '-1',
                    '-c:a', 'flac', str(root / (name + '.flac'))], check=True)
    (output / (name + '.flac')).write_bytes((root / (name + '.flac')).read_bytes())

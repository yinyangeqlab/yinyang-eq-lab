#!/usr/bin/env python3
"""Verify pinned external Potion 2M inputs and prepare the browser asset."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import shutil

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
REVISION = "389b9f64be5aa4ae7a6bc6fe95ef20ce485ae5da"
INPUTS = {
    "model.safetensors": "f95ffde02ad06f63ae38eb9d400038cd5ccaf8411ec3cb650c6025113f96cbb8",
    "tokenizer.json": "e67e803f624fb4d67dea1c730d06e1067e1b14d830e2c2202569e3ef0f70bb50",
}


def prepare(folder):
    inputs = {}
    for name, expected in INPUTS.items():
        data = (folder / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError(f"Input hash mismatch for {name} at revision {REVISION}")
        inputs[name] = data

    tensor = inputs["model.safetensors"]
    header_size, = struct.unpack_from("<Q", tensor)
    embeddings = json.loads(tensor[8:8 + header_size])["embeddings"]
    rows, dimensions = embeddings["shape"]
    weights = np.frombuffer(tensor, "<f4", offset=8 + header_size).reshape(rows, dimensions)
    vocabulary = json.loads(inputs["tokenizer.json"])["model"]["vocab"]
    words = "\n".join(sorted(vocabulary, key=vocabulary.get)).encode()
    # Each token gets its own scale to preserve small weights.
    scales = np.maximum(np.max(np.abs(weights), axis=1), 1e-12) / 7
    quantized = np.rint(weights / scales[:, None]).clip(-7, 7).astype("int8").ravel() + 8
    blob = struct.pack("<4sIII", b"SHM2", rows, dimensions, len(words))
    blob += scales.astype("<f4").tobytes() + (quantized[::2] | (quantized[1::2] << 4)).tobytes() + words
    destination = ROOT / "public/vendor/site-help/potion-2m-int4-v1.bin"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(blob)
    shutil.copyfile(ROOT / "vendor/potion-2m-model2vec.LICENSE", destination.with_name("LICENSE.txt"))
    print(f"{destination.relative_to(ROOT)}: {len(blob):,} bytes; SHA-256 {hashlib.sha256(blob).hexdigest()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", required=True, type=Path, help="External folder containing the pinned model and tokenizer")
    prepare(parser.parse_args().inputs)

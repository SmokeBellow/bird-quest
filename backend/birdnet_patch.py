#!/usr/bin/env python3
"""
Compatibility shim: patches tflite_runtime 2.14's missing `experimental`
namespace, then delegates to the real birdnet_analyzer module.

Usage: python birdnet_patch.py <module> [args...]
  module: birdnet_analyzer.analyze  or  birdnet_analyzer
"""
import sys
import types

# Apply patch before any birdnet_analyzer code is imported
try:
    import tflite_runtime.interpreter as _tflite
    if not hasattr(_tflite, 'experimental'):
        _exp = types.SimpleNamespace(
            OpResolverType=getattr(
                _tflite, 'OpResolverType',
                types.SimpleNamespace(BUILTIN_WITHOUT_DEFAULT_DELEGATES=1)
            )
        )
        _tflite.experimental = _exp
        print("[birdnet_patch] patched tflite_runtime.interpreter.experimental", flush=True)
except ImportError:
    pass  # no tflite_runtime — birdnet_analyzer will try tensorflow

import runpy

# argv[1] = module name, argv[2:] = real CLI args
module = sys.argv[1]
sys.argv = [module] + sys.argv[2:]
runpy.run_module(module, run_name='__main__', alter_sys=True)

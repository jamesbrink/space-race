"""Gibson's launch configuration on November 16, 1973."""

import sys
from pathlib import Path


def main():
    script = Path(__file__).resolve()
    sys.path.insert(0, str(script.parents[6] / "tools/blender"))
    sys.path.insert(0, str(script.parents[3] / "crew"))
    from third_visit import build_suit

    build_suit("Gibson", script)


main()

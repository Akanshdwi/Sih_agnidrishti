"""JSON stdin/stdout bridge used by the Node API for model inference."""

import json
import sys

from backend.app.ml.predictor import FirePredictor


def main() -> None:
    record = json.load(sys.stdin)
    result = FirePredictor().predict_record(record)
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
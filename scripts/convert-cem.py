"""Convert @cscfi/csc-ui vscode-data.json to Custom Elements Manifest format.
https://github.com/webcomponents/custom-elements-manifest to be used with JetBrains IDE's.

Usage:
    python3 scripts/convert-cem.py

Output: custom-elements.json in project root (for Rider Web Components Language Server plugin)
"""

import json
from pathlib import Path

INPUT = Path("node_modules/@cscfi/csc-ui/vscode-data.json")
OUTPUT = Path("custom-elements.json")


def convert(vscode_data: dict) -> dict:
    modules = []

    for tag in vscode_data.get("tags", []):
        tag_name = tag["name"]
        # c-button → CButton
        class_name = "".join(part.capitalize() for part in tag_name.split("-"))
        description = ""
        desc = tag.get("description", "")
        if isinstance(desc, dict):
            description = desc.get("value", "")
        elif isinstance(desc, str):
            description = desc

        attributes = [
            {
                "name": attr["name"],
                "description": attr.get("description", ""),
            }
            for attr in tag.get("attributes", [])
        ]

        members = [
            {
                "kind": "field",
                "name": attr["name"],
                "description": attr.get("description", ""),
            }
            for attr in tag.get("attributes", [])
        ]

        module_path = f"dist/components/{tag_name}/{tag_name}.js"

        modules.append({
            "kind": "javascript-module",
            "path": module_path,
            "declarations": [
                {
                    "kind": "class",
                    "customElement": True,
                    "name": class_name,
                    "tagName": tag_name,
                    "description": description,
                    "attributes": attributes,
                    "members": members,
                    "superclass": {"name": "HTMLElement"},
                }
            ],
            "exports": [
                {
                    "kind": "custom-element-definition",
                    "name": tag_name,
                    "declaration": {
                        "name": class_name,
                        "module": module_path,
                    },
                }
            ],
        })

    return {
        "schemaVersion": "2.1.0",
        "readme": "",
        "modules": modules,
    }


def main() -> None:
    if not INPUT.exists():
        print(f"Error: {INPUT} not found. Run from project root with node_modules installed.")
        return

    vscode_data = json.loads(INPUT.read_text())
    cem = convert(vscode_data)
    OUTPUT.write_text(json.dumps(cem, indent=2))

    tag_count = len(vscode_data.get("tags", []))
    print(f"Converted {tag_count} components → {OUTPUT}")
    print("Add 'custom-elements.json' to .gitignore if you don't want to commit it.")


if __name__ == "__main__":
    main()
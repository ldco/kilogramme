#!/usr/bin/env python3
"""Merge Kilo agent configs from kilo-agents.json into ~/.config/kilo/kilo.json"""
import json
import sys
import os

agents_file = os.path.join(os.path.dirname(__file__), "kilo", "kilo-agents.json")
kilo_config = os.path.expanduser("~/.config/kilo/kilo.json")

with open(agents_file) as f:
    agents_data = json.load(f)

if not os.path.exists(kilo_config):
    print(f"Creating {kilo_config} from agent template")
    with open(kilo_config, "w") as f:
        json.dump(agents_data, f, indent=2, ensure_ascii=False)
    sys.exit(0)

with open(kilo_config) as f:
    kilo_data = json.load(f)

if "agent" not in kilo_data:
    kilo_data["agent"] = {}

merged = agents_data.get("agent", {})
for name, config in merged.items():
    if name in kilo_data["agent"]:
        print(f"WARNING: Agent '{name}' already exists. Overwrite? [y/N] ", end="")
        resp = input().strip().lower()
        if resp != "y":
            print(f"  Skipping '{name}'")
            continue
    kilo_data["agent"][name] = config
    print(f"  Added agent: {name}")

with open(kilo_config, "w") as f:
    json.dump(kilo_data, f, indent=2, ensure_ascii=False)

print(f"Done. {kilo_config} updated with {len(merged)} agent(s).")

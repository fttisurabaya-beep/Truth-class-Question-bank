import re, random, json

def parse_table(path):
    rows = []
    in_table = False
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("| No |"):
                in_table = True
                continue
            if in_table:
                if line.startswith("|:-:") or line.startswith("|:--"):
                    continue
                if not line.startswith("|"):
                    break
                cells = [c.strip() for c in line.split("|")[1:-1]]
                if len(cells) < 11:
                    continue
                rows.append(cells)
    return rows

selected = {
    "M07": [1,2,5,6,8,9,10,11,12,13,15,16,17,19,21,22,23,24,26,27,28,29,30,32,34,35],
    "M08": [5,7,8,9,10,12,14,15,17,18,19],
    "M09": [2,4,6,7,9,11,12,14,15,16,17,18,19],
}

files = {
    "M07": "messages/M07/Truth_M07_QuestionBank_Tahap3_ID.md",
    "M08": "messages/M08/Truth_M08_QuestionBank_Tahap3_ID.md",
    "M09": "messages/M09/Truth_M09_QuestionBank_Tahap3_ID.md",
}

questions = []
for msg in ["M07","M08","M09"]:
    rows = {int(r[0]): r for r in parse_table(files[msg])}
    for no in selected[msg]:
        r = rows[no]
        questions.append({
            "msg": msg, "no": no, "point": r[1], "kes": r[2], "tipe": r[3],
            "stem": r[4], "options": [r[5], r[6], r[7], r[8]],  # A,B,C,D original; index0 = correct
            "bukti": r[10],
        })

print(f"Total questions: {len(questions)}")

best = None
best_score = None
for seed in range(1, 5000):
    random.seed(seed)
    positions = []
    for q in questions:
        pos = random.randint(0, 3)
        positions.append(pos)
    counts = [positions.count(i) for i in range(4)]
    score = max(counts) - min(counts)
    if best_score is None or score < best_score:
        best_score = score
        best = (seed, positions, counts)
    if best_score <= 1:
        break

seed, positions, counts = best
print(f"Best seed: {seed}, distribution A/B/C/D: {counts}")

# Build final shuffled question list
random.seed(seed)
final = []
for q, pos in zip(questions, positions):
    opts = q["options"][:]
    correct_text = opts[0]
    # rotate: place correct_text at index `pos`, keep distractors in original relative order
    distractors = opts[1:]
    random.shuffle(distractors)
    new_opts = [None]*4
    new_opts[pos] = correct_text
    di = 0
    for i in range(4):
        if new_opts[i] is None:
            new_opts[i] = distractors[di]
            di += 1
    final.append({
        **q,
        "final_options": new_opts,
        "correct_letter": "ABCD"[pos],
    })

with open("/tmp/shuffled_50.json", "w", encoding="utf-8") as f:
    json.dump(final, f, ensure_ascii=False, indent=2)

print("Saved /tmp/shuffled_50.json")
letter_counts = {}
for q in final:
    letter_counts[q["correct_letter"]] = letter_counts.get(q["correct_letter"], 0) + 1
print("Final letter distribution:", letter_counts)

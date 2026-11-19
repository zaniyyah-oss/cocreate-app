import { describe, expect, it } from "vitest";
import { matchWordStudies, type WordStudy } from "./word-bank";
const w = (id: string, term: string, strongs: string | null = null): WordStudy => ({ id, term, strongs, user_id: "u", original: "", original_script: null, language: null, part_of_speech: null, meaning: "", notes: null, notes_text: "", created_at: "", updated_at: "" });
describe("word bank suggestions", () => {
  const bank = [w("1", "wisdom", "H2451"), w("2", "Hear", "H8085"), w("3", "temple")];
  it("matches case-insensitively", () => expect(matchWordStudies(bank, "HEAR").map((x) => x.id)).toEqual(["2"]));
  it("matches a simple stem (wise / wisdom)", () => expect(matchWordStudies(bank, "wise").map((x) => x.id)).toEqual(["1"]));
  it("matches by Strong's number", () => expect(matchWordStudies(bank, "listen", "h8085").map((x) => x.id)).toEqual(["2"]));
  it("doesn't match unrelated words", () => expect(matchWordStudies(bank, "cedar")).toEqual([]));
});

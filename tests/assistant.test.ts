import assert from "node:assert/strict";
import { test } from "node:test";
import { answerGuide } from "../src/features/assistant/guide";

test("guides a user to password recovery", () => {
  const answer = answerGuide("Saya lupa password, gimana ya?");
  assert.equal(answer.href, "/masuk");
  assert.match(answer.text, /pemulihan/i);
});

test("preserves posted history when explaining deletion", () => {
  assert.match(answerGuide("Bisa hapus transaksi yang sudah posted?").text, /histori|terposting/i);
});

test("does not invent live data or unsupported answers", () => {
  const answer = answerGuide("Berapa saldo barang saya sekarang?");
  assert.match(answer.text, /Gudang/);
  assert.doesNotMatch(answer.text, /saldo Anda adalah/);
  assert.equal(answerGuide("Siapa juara sepak bola?").href, undefined);
});

test("matches warehouse tasks without unrelated login advice", () => {
  assert.equal(answerGuide("Bagaimana cara menerima barang PO?").href, "/gudang");
});

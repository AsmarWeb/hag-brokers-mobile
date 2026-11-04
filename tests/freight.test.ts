import test from "node:test";
import assert from "node:assert/strict";
import { freightBody, freightStatus } from "../src/core/freight";
import { MutationIntent } from "../src/core/intent";
const origin = {
  id: 1,
  name: "Jebel Ali",
  country_code: "AE",
  port_code: null,
};
const destination = { ...origin, id: 2, name: "Hamburg" };
test("freight payload uses exact selected ports and never includes identity or prices", () => {
  const body = freightBody(
    origin,
    destination,
    " Equipment ",
    "40HC",
    "2",
    "1200.50",
    "2027-01-12",
  );
  assert.deepEqual(body, {
    origin_port_id: 1,
    destination_port_id: 2,
    cargo_type: "Equipment",
    container_type: "40HC",
    quantity: 2,
    weight: "1200.50",
    preferred_date: "2027-01-12",
  });
  for (const args of [
    [null, destination, "Cargo", "40HC", "1", "", ""],
    [origin, origin, "Cargo", "40HC", "1", "", ""],
    [origin, destination, "Cargo", "40HC", "0", "", ""],
    [origin, destination, "Cargo", "40HC", "1", "-1", ""],
    [origin, destination, "Cargo", "40HC", "1", "", "tomorrow"],
  ] as const)
    assert.equal(
      freightBody(
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6],
      ),
      null,
    );
});
test("uncertain freight submission retries same key and prevents changed shipment", () => {
  const intent = new MutationIntent(() => "request-key");
  const body = { quantity: 1 };
  assert.equal(intent.prepare(body), "request-key");
  intent.failed(503);
  assert.equal(intent.prepare(body), "request-key");
  assert.throws(() => intent.prepare({ quantity: 2 }));
  assert.equal(freightStatus("pending", true), "بانتظار المراجعة");
  assert.equal(freightStatus("<script>", false), "Status update pending");
});

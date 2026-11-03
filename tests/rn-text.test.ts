import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

test("native layout children never contain raw text or explicit space literals", () => {
  const files = ["App.tsx"];
  const list = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) list(file);
      else if (file.endsWith(".tsx")) files.push(file);
    }
  };
  list("src");
  const violations: string[] = [];
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      const directChild =
        !!node.parent &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent));
      let raw = false;
      if (directChild && ts.isJsxText(node))
        raw =
          node.text.trim().length > 0 ||
          (!node.text.includes("\n") && node.text.length > 0);
      if (directChild && ts.isJsxExpression(node) && node.expression) {
        const e = node.expression;
        raw =
          ts.isStringLiteral(e) ||
          ts.isNumericLiteral(e) ||
          ts.isNoSubstitutionTemplateLiteral(e) ||
          ts.isTemplateExpression(e) ||
          (ts.isCallExpression(e) &&
            ["t", "label"].includes(e.expression.getText(source)));
      }
      if (raw) {
        let parent: ts.Node | undefined = node.parent;
        while (parent && !ts.isJsxElement(parent)) parent = parent.parent;
        const tag =
          parent && ts.isJsxElement(parent)
            ? parent.openingElement.tagName.getText(source)
            : undefined;
        if (tag && !["Text", "Txt", "Badge"].includes(tag)) {
          const loc = source.getLineAndCharacterOfPosition(
            node.getStart(source),
          );
          violations.push(`${file}:${loc.line + 1}: raw text inside ${tag}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.deepEqual(
    violations,
    [],
    "Wrap text in Text/Txt/Badge; remove stray JSX space expressions.",
  );
});

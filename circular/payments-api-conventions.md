rule: All payment mutations must emit a structured audit log before returning
rule: Never store or log raw card data (PAN, CVV, full card number)
rule: All thrown errors must include a correlationId field
rule: Error responses must include correlationId for tracing
applies_to: ["src/payments/**/*.ts", "src/lending/**/*.kt"]

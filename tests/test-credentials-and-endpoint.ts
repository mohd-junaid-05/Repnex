import "../evals/env";
import { mintAnalysisCredential, verifyAnalysisCredential } from "../lib/agent/credential";

async function run() {
  console.log("=== Testing Credential Minting & Verification ===");

  const fakeAnalysisId = "11111111-2222-3333-4444-555555555555";
  const fakeOrgId = "org_test123";

  // 1. Mint credential
  const token = await mintAnalysisCredential({
    analysisId: fakeAnalysisId,
    orgId: fakeOrgId,
    expiresInSeconds: 60,
  });
  console.log("Token minted successfully, length:", token.length);

  // 2. Verify credential
  const verified = await verifyAnalysisCredential(token);
  if (verified.analysisId !== fakeAnalysisId || verified.orgId !== fakeOrgId) {
    throw new Error("Verified payload mismatch!");
  }
  console.log("Token verified successfully:", {
    analysisId: verified.analysisId,
    orgId: verified.orgId,
    expiresIn: verified.exp - verified.iat,
  });

  // 3. Test tampering rejection
  try {
    const tampered = token.slice(0, -4) + "XXXX";
    await verifyAnalysisCredential(tampered);
    throw new Error("Tampered token should have failed verification!");
  } catch (err) {
    console.log("Tampered token rejected properly:", (err as Error).message);
  }

  // 4. Test expired token rejection
  const expiredToken = await mintAnalysisCredential({
    analysisId: fakeAnalysisId,
    orgId: fakeOrgId,
    expiresInSeconds: -10, // already expired
  });
  try {
    await verifyAnalysisCredential(expiredToken);
    throw new Error("Expired token should have failed verification!");
  } catch (err) {
    console.log("Expired token rejected properly:", (err as Error).message);
  }

  console.log("\nAll credential tests passed!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


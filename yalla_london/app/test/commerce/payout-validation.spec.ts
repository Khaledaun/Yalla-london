/**
 * Unit tests for payout profile — lib/commerce/constants.ts (PAYOUT_PROFILE)
 *
 * Validates the Mercury payout profile template: routing number format,
 * account number presence, SWIFT/BIC format, and field consistency.
 */

import { describe, it, expect } from "vitest";
import { PAYOUT_PROFILE } from "../../lib/commerce/constants";
import type { PayoutProfileTemplate } from "../../lib/commerce/types";

// ─── Helper: Validate ABA routing number format ─────────────────────
// ABA routing numbers are exactly 9 digits and pass the checksum algorithm.
function isValidRoutingNumber(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;

  // ABA checksum: 3a + 7b + c + 3d + 7e + f + 3g + 7h + i must be divisible by 10
  const digits = routing.split("").map(Number);
  const checksum =
    3 * digits[0] +
    7 * digits[1] +
    1 * digits[2] +
    3 * digits[3] +
    7 * digits[4] +
    1 * digits[5] +
    3 * digits[6] +
    7 * digits[7] +
    1 * digits[8];

  return checksum % 10 === 0;
}

// ─── Helper: Validate SWIFT/BIC format ──────────────────────────────
// SWIFT codes are 8 or 11 characters: 4 bank code + 2 country + 2 location [+ 3 branch]
function isValidSwiftFormat(swift: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift);
}

// ─── Helper: Check masked account number format ─────────────────────
function isMaskedAccountNumber(value: string): boolean {
  // Expected format: ****XXXX (last 4 digits shown)
  return /^\*{4}\d{4}$/.test(value);
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("Payout Profile — Template Validation", () => {
  it("has a valid profile name referencing Mercury and Zenitha", () => {
    expect(PAYOUT_PROFILE.profileName).toBeTruthy();
    expect(PAYOUT_PROFILE.profileName).toContain("Mercury");
    expect(PAYOUT_PROFILE.profileName).toContain("Zenitha");
  });

  it("has legal entity set to Zenitha.Luxury LLC", () => {
    expect(PAYOUT_PROFILE.legalEntity).toBe("Zenitha.Luxury LLC");
  });

  it("has a complete beneficiary address with all required fields", () => {
    const addr = PAYOUT_PROFILE.beneficiaryAddress;
    expect(addr.line1).toBeTruthy();
    expect(addr.city).toBeTruthy();
    expect(addr.state).toBeTruthy();
    expect(addr.zip).toBeTruthy();
    expect(addr.country).toBeTruthy();
  });

  it("beneficiary address country is US", () => {
    expect(PAYOUT_PROFILE.beneficiaryAddress.country).toBe("US");
  });

  it("beneficiary address state is DE (Delaware)", () => {
    expect(PAYOUT_PROFILE.beneficiaryAddress.state).toBe("DE");
  });

  it("zip code is a valid 5-digit US zip", () => {
    expect(PAYOUT_PROFILE.beneficiaryAddress.zip).toMatch(/^\d{5}$/);
  });
});

describe("Payout Profile — Domestic Banking", () => {
  it("routing number is exactly 9 digits", () => {
    expect(PAYOUT_PROFILE.domestic.routingAba).toMatch(/^\d{9}$/);
  });

  it("routing number passes ABA checksum validation", () => {
    expect(isValidRoutingNumber(PAYOUT_PROFILE.domestic.routingAba)).toBe(true);
  });

  it("account number is present and masked", () => {
    expect(PAYOUT_PROFILE.domestic.accountNumber).toBeTruthy();
    expect(isMaskedAccountNumber(PAYOUT_PROFILE.domestic.accountNumber)).toBe(true);
  });

  it("account type is Checking", () => {
    expect(PAYOUT_PROFILE.domestic.accountType).toBe("Checking");
  });

  it("bank name is specified", () => {
    expect(PAYOUT_PROFILE.domestic.bankName).toBeTruthy();
    expect(PAYOUT_PROFILE.domestic.bankName.length).toBeGreaterThan(3);
  });

  it("bank address is specified", () => {
    expect(PAYOUT_PROFILE.domestic.bankAddress).toBeTruthy();
    expect(PAYOUT_PROFILE.domestic.bankAddress.length).toBeGreaterThan(10);
  });
});

describe("Payout Profile — International USD", () => {
  it("SWIFT/BIC code follows valid format (8 or 11 chars)", () => {
    expect(isValidSwiftFormat(PAYOUT_PROFILE.internationalUsd.swift)).toBe(true);
  });

  it("ABA routing matches domestic routing", () => {
    expect(PAYOUT_PROFILE.internationalUsd.aba).toBe(
      PAYOUT_PROFILE.domestic.routingAba,
    );
  });

  it("account number matches domestic account number", () => {
    expect(PAYOUT_PROFILE.internationalUsd.accountNumber).toBe(
      PAYOUT_PROFILE.domestic.accountNumber,
    );
  });
});

describe("Payout Profile — International Non-USD", () => {
  it("intermediary bank SWIFT follows valid format", () => {
    // CHASUS33XXX — 11 chars
    expect(
      isValidSwiftFormat(PAYOUT_PROFILE.internationalNonUsd.intermediarySwift),
    ).toBe(true);
  });

  it("intermediary ABA routing is 9 digits", () => {
    expect(PAYOUT_PROFILE.internationalNonUsd.intermediaryAba).toMatch(
      /^\d{9}$/,
    );
  });

  it("intermediary ABA passes checksum validation", () => {
    expect(
      isValidRoutingNumber(PAYOUT_PROFILE.internationalNonUsd.intermediaryAba),
    ).toBe(true);
  });

  it("intermediary bank name includes JPMorgan", () => {
    expect(PAYOUT_PROFILE.internationalNonUsd.intermediaryBank).toContain(
      "JPMorgan",
    );
  });

  it("beneficiary bank account is present and masked", () => {
    expect(
      PAYOUT_PROFILE.internationalNonUsd.beneficiaryBankAccount,
    ).toBeTruthy();
    expect(
      isMaskedAccountNumber(
        PAYOUT_PROFILE.internationalNonUsd.beneficiaryBankAccount,
      ),
    ).toBe(true);
  });

  it("reference field contains entity name", () => {
    expect(PAYOUT_PROFILE.internationalNonUsd.reference).toContain(
      "Zenitha.Luxury LLC",
    );
  });

  it("reference field contains FFC routing instruction", () => {
    expect(PAYOUT_PROFILE.internationalNonUsd.reference).toContain("/FFC/");
  });
});

describe("Payout Profile — Cross-Field Consistency", () => {
  it("domestic and international USD use same account number", () => {
    expect(PAYOUT_PROFILE.domestic.accountNumber).toBe(
      PAYOUT_PROFILE.internationalUsd.accountNumber,
    );
  });

  it("domestic routing and international USD ABA match", () => {
    expect(PAYOUT_PROFILE.domestic.routingAba).toBe(
      PAYOUT_PROFILE.internationalUsd.aba,
    );
  });

  it("profile conforms to PayoutProfileTemplate type shape", () => {
    // TypeScript compile-time check — if this compiles, the shape matches.
    const profile: PayoutProfileTemplate = PAYOUT_PROFILE;
    expect(profile).toBeDefined();

    // Verify all top-level keys are present
    expect(profile).toHaveProperty("profileName");
    expect(profile).toHaveProperty("legalEntity");
    expect(profile).toHaveProperty("beneficiaryAddress");
    expect(profile).toHaveProperty("domestic");
    expect(profile).toHaveProperty("internationalUsd");
    expect(profile).toHaveProperty("internationalNonUsd");
  });

  it("reference field contains the masked domestic account number", () => {
    // The reference includes the domestic account's last 4 digits
    expect(PAYOUT_PROFILE.internationalNonUsd.reference).toContain(
      PAYOUT_PROFILE.domestic.accountNumber,
    );
  });
});

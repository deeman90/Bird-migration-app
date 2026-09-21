import { DonationRecord, DonationCause } from '../types';
import { safeFetchJson } from '../utils/apiClient';

const DONATIONS_STORAGE_KEY = 'aerotrack_donations_ledger';

export const INITIAL_DONATIONS: DonationRecord[] = [];

export function getStoredDonations(): DonationRecord[] {
  try {
    const raw = localStorage.getItem(DONATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out any legacy mock donation records
    const clean = parsed.filter((d) => d && d.id && !d.id.startsWith('don-init-'));
    if (clean.length !== parsed.length) {
      localStorage.setItem(DONATIONS_STORAGE_KEY, JSON.stringify(clean));
    }
    return clean;
  } catch {
    return [];
  }
}

export async function saveDonation(record: DonationRecord): Promise<DonationRecord> {
  // Save to local storage first
  try {
    const current = getStoredDonations();
    const updated = [record, ...current.filter((d) => d.id !== record.id)];
    localStorage.setItem(DONATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Donation Service] Local save warning:', err);
  }

  // Attempt server verification/sync
  try {
    await safeFetchJson('/api/donations/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch {
    // Local persistence is authoritative for client state
  }

  return record;
}

export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `BMA-DON-${year}-${randomSuffix}`;
}

export const CAUSE_DETAILS: Record<
  DonationCause,
  { title: string; badge: string; icon: string; description: string; impact: string }
> = {
  platform_infrastructure: {
    title: 'Platform Infrastructure & Independence',
    badge: 'Priority #1',
    icon: 'Sparkles',
    description: 'Help us accelerate feature development, maintain infrastructure, and remain independent.',
    impact: 'Funds core cloud compute, live radar data ingest, rapid feature rollout, and preserves 100% independent ad-free research.',
  },
  telemetry_tags: {
    title: 'Satellite Telemetry Tags',
    badge: 'Solar GPS',
    icon: 'Radio',
    description: 'Miniaturized 2.5-gram solar GPS transponders attached to high-risk migratory species.',
    impact: '$50 funds 2 months of high-resolution satellite telemetry satellite uplink bandwidth.',
  },
  habitat_wetlands: {
    title: 'Stopover Wetland Sanctuaries',
    badge: 'Habitat',
    icon: 'Trees',
    description: 'Guarding critical coastal mudflats, estuaries, and inland reed beds where millions refuel.',
    impact: '$25 preserves 1 acre of vital wetland buffer zone against encroachment.',
  },
  youth_education: {
    title: 'Community Bioacoustic & Kits',
    badge: 'Field Gear',
    icon: 'Binoculars',
    description: 'Providing optic kits, field guides, and automated night-flight audio sensors to local rangers.',
    impact: '$35 equips a community observer team with calibrated bioacoustic monitoring equipment.',
  },
  general_conservation: {
    title: 'Global Avian Flyway Defense',
    badge: 'Emergency',
    icon: 'HeartHandshake',
    description: 'Flexible funding deployed where habitat destruction or weather anomalies strike hardest.',
    impact: '100% directly allocated to active conservation research & emergency sanctuary rescues.',
  },
};

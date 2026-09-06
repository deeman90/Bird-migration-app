import { DonationRecord, DonationCause } from '../types';
import { safeFetchJson } from '../utils/apiClient';

const DONATIONS_STORAGE_KEY = 'aerotrack_donations_ledger';

export const INITIAL_DONATIONS: DonationRecord[] = [
  {
    id: 'don-init-0',
    donorName: 'Open Science & Migration Guild',
    donorEmail: 'guild@openscience.org',
    amount: 500,
    currency: 'USD',
    cause: 'platform_infrastructure',
    frequency: 'monthly',
    message: 'Keeping independent open-source flyway radar tracking infrastructure fast, secure, and ad-free.',
    isAnonymous: false,
    date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    provider: 'card',
    status: 'completed',
    receiptNumber: 'BMA-DON-2026-9901',
  },
  {
    id: 'don-init-1',
    donorName: 'Dr. Evelyn Vance',
    donorEmail: 'evelyn.vance@audubon-alliance.org',
    amount: 150,
    currency: 'USD',
    cause: 'telemetry_tags',
    frequency: 'one_time',
    message: 'To support GPS satellite tracking of the Arctic Tern on its Atlantic journey.',
    isAnonymous: false,
    date: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    provider: 'card',
    status: 'completed',
    receiptNumber: 'BMA-DON-2026-9481',
  },
  {
    id: 'don-init-2',
    donorName: 'Nordic Flyway Trust',
    donorEmail: 'contact@nordicflyways.no',
    amount: 250,
    currency: 'USD',
    cause: 'habitat_wetlands',
    frequency: 'monthly',
    message: 'Dedicated to preserving stopover mudflats along the Wadden Sea corridor.',
    isAnonymous: false,
    date: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
    provider: 'bank_transfer',
    status: 'completed',
    receiptNumber: 'BMA-DON-2026-8922',
  },
  {
    id: 'don-init-3',
    donorName: 'Anonymous Birder',
    donorEmail: 'donor@gmail.com',
    amount: 50,
    currency: 'USD',
    cause: 'youth_education',
    frequency: 'one_time',
    message: 'In loving memory of my grandfather who introduced me to morning bird walks.',
    isAnonymous: true,
    date: new Date(Date.now() - 1000 * 60 * 60 * 75).toISOString(),
    provider: 'paystack',
    status: 'completed',
    receiptNumber: 'BMA-DON-2026-7734',
  },
  {
    id: 'don-init-4',
    donorName: 'Marcus Lindholm',
    donorEmail: 'marcus.l@bioacoustics.fi',
    amount: 75,
    currency: 'USD',
    cause: 'telemetry_tags',
    frequency: 'monthly',
    message: 'Autonomous bioacoustic sensing for nocturnal passerine migration.',
    isAnonymous: false,
    date: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    provider: 'card',
    status: 'completed',
    receiptNumber: 'BMA-DON-2026-6219',
  },
];

export function getStoredDonations(): DonationRecord[] {
  try {
    const raw = localStorage.getItem(DONATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DONATIONS_STORAGE_KEY, JSON.stringify(INITIAL_DONATIONS));
      return INITIAL_DONATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DONATIONS;
  } catch {
    return INITIAL_DONATIONS;
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

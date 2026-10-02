# Igura Marketplace — Pricing Strategy

## 1. Current State Analysis

### What Exists Now
| Plan | Price (RWF) | Role | Listings | Images |
|------|-------------|------|----------|--------|
| House Client | 2,000 | CLIENT | 0 | 0 |
| House Commissionaire | 5,000 | COMMISSIONAIRE | 10 | 3 |
| Plot Client | 15,000 | CLIENT | 0 | 0 |
| Plot Commissionaire | 20,000 | COMMISSIONAIRE | 10 | 3 |
| House Selling VVIP Client | 10,000 | CLIENT | 0 | 0 |
| House Selling VVIP Commissionaire | 25,000 | COMMISSIONAIRE | 10 | 3 |

**Phone Reveal:** 2,000 RWF one-time per property
**Free Launch:** Authenticated commissionaires can publish up to 5 active listings, with 3 images per listing and 1 total video up to 20 seconds.

### Problems
1. **Clients pay to browse** — we removed the paywall, but plans still charge clients for "search" and "view" which are now free
2. **No value metric** — pricing is flat, doesn't scale with success
3. **No upgrade triggers** — once you pick a plan, there's no reason to upgrade
4. **VVIP naming is confusing** — "House Selling VVIP" doesn't communicate value
5. **No tier differentiation** — paid tiers still need distinct limits and features when billing is enabled
6. **Phone reveal is disconnected** — 2,000 RWF one-time doesn't build recurring revenue

---

## 2. Pricing Principles

### Value Metric: **Success-Based + Listing Volume**
The value Igura delivers to commissionaires is **connecting them with clients who contact them**. The value metric should be:
- **Primary:** Number of active listings (scales with inventory)
- **Secondary:** Number of contacts received (scales with success)
- **Tertiary:** Premium placement (boost, rank, recommend)

### Pricing Model: **Subscription + Transaction Fee**
- **Monthly subscription** for listing access and tools
- **Per-contact fee** when a client reveals a phone number (revenue share)
- **Premium add-ons** for boost/rank/recommend

---

## 3. New Pricing Structure

### For Clients (Browsers)
**Free — No plan needed.** Clients browse, search, and view listings freely. They pay only when they want to contact an owner (2,000 RWF phone reveal).

This eliminates client-side friction and maximizes traffic for commissionaires.

### For Commissionaires (Listers) — Good / Better / Best

#### Starter (Good)
**Free launch, then 5,000 RWF/month when billing is enabled**
- Up to 5 active listings
- 3 images per listing
- Basic search visibility
- Contact leads (client phone reveals)
- **Upgrade trigger:** Hit 5 listing limit or want more images

#### Professional (Better) — *Recommended*
**15,000 RWF/month**
- Up to 20 active listings
- 6 images per listing
- Priority search placement
- Contact leads
- Listing analytics (views, inquiries)
- **Boost** listings (3 free boosts/month)
- **Upgrade trigger:** Want unlimited listings or premium placement

#### Enterprise (Best)
**40,000 RWF/month**
- Unlimited active listings
- 10 images per listing
- Top search placement
- Contact leads
- Full analytics dashboard
- Unlimited boosts
- **Recommend** listings (homepage featured)
- Dedicated account support
- Custom branding on listings

### Per-Transaction Revenue
When a client reveals a phone number:
- **Client pays:** 2,000 RWF
- **Igura keeps:** 500 RWF (25%)
- **Commissionaire receives:** 1,500 RWF (75%)

This aligns incentives: Igura only makes money when commissionaires succeed.

---

## 4. Marketplace-Specific Pricing

### House Rental
| Tier | Price/month | Listings | Images | Features |
|------|-------------|----------|--------|----------|
| Starter | Free → 5,000 | 5 | 3 | Basic visibility |
| Professional | 15,000 | 20 | 6 | Priority + analytics |
| Enterprise | 40,000 | Unlimited | 10 | Full suite |

### Plot Selling
| Tier | Price/month | Listings | Images | Features |
|------|-------------|----------|--------|----------|
| Starter | Free → 8,000 | 5 | 3 | Basic visibility |
| Professional | 25,000 | 20 | 6 | Priority + analytics |
| Enterprise | 60,000 | Unlimited | 10 | Full suite |

*Plots priced higher because average transaction value is higher (land deals).*

### House Selling (VVIP)
| Tier | Price/month | Listings | Images | Features |
|------|-------------|----------|--------|----------|
| Starter | Free → 10,000 | 5 | 3 | Basic visibility |
| Professional | 30,000 | 20 | 6 | Priority + analytics |
| Enterprise | 75,000 | Unlimited | 10 | Full suite |

*House selling priced highest because average deal size is largest.*

---

## 5. Upgrade Triggers

| Trigger | Current Tier | Action |
|---------|--------------|--------|
| Hit listing limit | Starter | Upgrade to Professional |
| Want more images | Starter | Upgrade to Professional |
| Want analytics | Starter | Upgrade to Professional |
| Want more boosts | Professional | Upgrade to Enterprise |
| Want homepage features | Professional | Upgrade to Enterprise |
| Want custom branding | Professional | Upgrade to Enterprise |
| Free trial ending | Free period | Convert to Starter |

---

## 6. Revenue Projections

### Assumptions
- 100 commissionaires across all marketplaces
- 60% Starter, 30% Professional, 10% Enterprise
- Average 5 phone reveals per commissionaire per month

### Monthly Revenue
| Source | Calculation | Revenue (RWF) |
|--------|-------------|---------------|
| Starter subscriptions | 60 × 7,500 (avg) | 450,000 |
| Professional subscriptions | 30 × 23,333 (avg) | 700,000 |
| Enterprise subscriptions | 10 × 58,333 (avg) | 583,333 |
| Phone reveal fees | 100 × 5 × 500 | 250,000 |
| **Total** | | **1,983,333** |

### Annual Revenue
~23.8M RWF (~$18,000 USD)

---

## 7. Implementation Roadmap

### Phase 1: Immediate (Now)
- [x] Remove client paywall (done)
- [x] Free browsing for all (done)
- [x] 30-day free listing for commissionaires (done)
- [ ] Update seed-plans to use new pricing
- [ ] Update memberships page with tier comparison

### Phase 2: Short-term (1-2 weeks)
- [ ] Add listing analytics for Professional tier
- [ ] Implement boost feature with monthly allotment
- [ ] Add recommend feature for Enterprise tier
- [ ] Create pricing comparison page

### Phase 3: Medium-term (1 month)
- [ ] Implement per-contact revenue share
- [ ] Add usage tracking (views, inquiries per listing)
- [ ] Build upgrade prompts based on usage
- [ ] A/B test pricing on new signups

---

## 8. Pricing Psychology Applied

1. **Anchoring:** Enterprise tier makes Professional look affordable
2. **Decoy:** Starter tier is obviously limited, driving upgrades to Professional
3. **Free launch:** permanent initial allowance reduces risk while marketplace supply is built
4. **Loss aversion:** "You've received 12 inquiries this month — upgrade to keep them coming"
5. **Social proof:** "85% of top commissionaires use Professional"
6. **Annual discount:** 20% off for annual commitment (e.g., Professional: 15,000 → 12,000/month)

---

## 9. Competitive Positioning

### vs. Jumia House
- Jumia charges flat listing fees with no success-based component
- Igura differentiates with phone reveal revenue share

### vs. Craigslist Rwanda
- Craigslist is free but unmoderated
- Igura offers verified listings and analytics

### vs. Facebook Marketplace
- Facebook is free but no property-specific tools
- Igura offers specialized real estate features

**Igura's unique value:** Success-based pricing + phone reveal revenue share + specialized real estate tools

---

## 10. Key Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Trial-to-paid conversion | >30% | Free period effectiveness |
| ARPU | >15,000 RWF | Revenue per commissionaire |
| Churn rate | <5% monthly | Pricing satisfaction |
| Phone reveal rate | >20% of views | Value delivery |
| Upgrade rate | >15% quarterly | Tier progression |
| NPS | >50 | Overall pricing fairness |

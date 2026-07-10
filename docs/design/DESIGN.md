# AI SRE Investigator Design System

> Codename: **Observatory** — Indigo Porcelain dark operation tool.
> Influences: Linear (precision, luminance stepping, semi-transparent borders) + Sentry (observability domain, status semantics, terminal aesthetic).
> Source of truth for all UI prototypes and frontend implementation.

## 1. Visual Theme & Atmosphere

**Mood**: Dense operational. Quiet, precise, scannable. An SRE tool that looks like it belongs next to a terminal, not a marketing site.

**Feel**: The interface should feel like a well-organized monitoring console. Information is dense but never claustrophobic. Every pixel earns its place. The dark canvas lets data, metrics, and code blocks glow with clarity.

**References**: Linear's near-black precision with luminance-based depth. Sentry's developer-tool semantic colors. Grafana's data density. Warp's terminal-native typography.

**Key characteristics**:
- Deep indigo-black background with blue undertone (not pure black, not purple)
- Surface elevation via white-opacity luminance stepping (never solid dark colors for stacking)
- Semi-transparent white borders (whisper-thin, structural without noise)
- Single indigo-violet accent reserved for interactive elements only
- Semantic status colors (emerald / amber / rose / sky) carrying operational meaning
- Inter for UI, JetBrains Mono for all code, QL, metrics, and data
- No decorative gradients, orbs, or blurs. The data IS the visual interest.

## 2. Color Palette & Roles

### Background surfaces

| Role | Hex | Description |
|------|-----|-------------|
| **App background** | `#0a0c14` | The deepest canvas. Blue-undertone near-black. |
| **Sidebar** | `#0e1020` | One step up from app bg. Panel for navigation. |
| **Main panel** | `#0c0e18` | Chat/timeline/report canvas. |
| **Surface 1** | `#141728` | Elevated cards, step cards, code blocks. |
| **Surface 2** | `#1a1e34` | Hover states, dropdowns, active items. |

### Text hierarchy

| Role | Hex | Description |
|------|-----|-------------|
| **Text primary** | `#e8eaf0` | Near-porcelain white. Headlines, key values. |
| **Text secondary** | `#a0a6b8` | Body text, descriptions. |
| **Text tertiary** | `#6b7088` | Metadata, timestamps, de-emphasized. |
| **Text quaternary** | `#444962` | Placeholders, disabled states. |

### Accent & brand

| Role | Hex | Description |
|------|-----|-------------|
| **Indigo primary** | `#5e8aff` | Primary actions, links, active states. |
| **Indigo hover** | `#7aa1ff` | Hover on interactive accent elements. |
| **Indigo muted** | `#3a5599` | Subtle indigo backgrounds (badges, selections). |

### Status semantics

| Role | Hex | Description |
|------|-----|-------------|
| **Success / OK** | `#10b981` | Probe succeeded, investigation complete. |
| **Warning / Self-healing** | `#f59e0b` | Query failed but auto-retrying, budget low. |
| **Error / Critical** | `#f43f5e` | Probe failed, RCA partial, budget exhausted. |
| **Info / Running** | `#38bdf8` | Probe in-flight, investigation active. |

### Borders

| Role | Value | Description |
|------|-------|-------------|
| **Border subtle** | `rgba(255,255,255,0.06)` | Default surface separators. |
| **Border standard** | `rgba(255,255,255,0.08)` | Cards, code blocks, inputs. |
| **Border emphasis** | `rgba(255,255,255,0.12)` | Active items, focus rings. |
| **Border solid** | `#252940` | When opacity is impractical. |

## 3. Typography Rules

### Font families

```css
--font-sans: 'Inter', -apple-system, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
```

- **Inter** with OpenType feature `"cv01"` (single-story `a`) for cleaner geometry. Variable weights 400, 500, 600 only.
- **JetBrains Mono** for all PromQL/LogQL/TraceQL code, metric values, timestamps, TraceIDs, and data tables. The monospace face is a core identity element.

### Size hierarchy

| Role | Size | Weight | LH | LS | Font | Use |
|------|------|--------|----|----|------|-----|
| Page title | 20px | 600 | 1.3 | -0.01em | Inter | RCA report title, section headers |
| Card title | 15px | 600 | 1.4 | 0 | Inter | Step card probe name, panel header |
| Body | 14px | 400 | 1.5 | 0 | Inter | Descriptions, conversation messages |
| Body emphasis | 14px | 500 | 1.5 | 0 | Inter | Key labels, button text |
| Small | 13px | 400 | 1.5 | 0 | Inter | Secondary body, metadata |
| Caption | 12px | 500 | 1.4 | 0 | Inter | Status labels, badges |
| Micro | 11px | 500 | 1.4 | 0.02em | Inter | Overline labels, uppercase tags |
| Code body | 13px | 400 | 1.6 | 0 | JetBrains Mono | QL code blocks |
| Code label | 12px | 400 | 1.4 | 0 | JetBrains Mono | Metric values, IDs, data |
| Data large | 24px | 600 | 1.2 | -0.02em | JetBrains Mono | Key metric values |

### Principles

- **400 reads, 500 scans, 600 anchors.** No bold above 600 in UI chrome.
- **Monospace carries meaning.** If it is data, a query, a timestamp, or an identifier, it gets JetBrains Mono.
- **Negative letter-spacing only at 18px+.** Below that, spacing is 0.

## 4. Component Stylings

### Buttons

**Primary (indigo)**
- Background: `#5e8aff`, Text: `#ffffff`, Padding: `8px 16px`, Radius: `6px`
- Font: Inter 14px / 500. Hover: `#7aa1ff`.
- Focus-visible: `0 0 0 2px #0a0c14, 0 0 0 4px #5e8aff`.

**Ghost (default)**
- Background: `rgba(255,255,255,0.04)`, Text: `#a0a6b8`
- Border: `1px solid rgba(255,255,255,0.08)`, Padding: `6px 12px`, Radius: `6px`
- Hover: background `rgba(255,255,255,0.07)`, text `#e8eaf0`.

**Icon button**
- Background: transparent, Size: `32px`, Radius: `6px`
- Hover: `rgba(255,255,255,0.06)` background.

### Status dot

- Size: `8px`, Radius: `50%`.
- Success: `#10b981`. Self-healing: `#f59e0b`. Error: `#f43f5e`. Running: `#38bdf8` (pulse animation).
- Paired with 12px caption in matching color at 70% opacity.

### Step card (Timeline)

- Background: `#141728`, Border: `1px solid rgba(255,255,255,0.06)`, Radius: `8px`.
- Padding: `14px 16px`. Hover: border `rgba(255,255,255,0.10)`.
- Header row: icon + probe name + status dot + latency badge. Collapsible body: QL code block + result summary.
- Left border accent: 2px solid in status color.

### Code block

- Background: `#0a0c14` (recessed inset), Border: `1px solid rgba(255,255,255,0.06)`, Radius: `6px`.
- Padding: `12px 14px`. Font: JetBrains Mono 13px / 400, line-height 1.6.
- Header bar: probe language label (left) + copy button (right).

### Badge / Pill

- Background: `rgba(255,255,255,0.05)`, Text: `#a0a6b8`
- Radius: `9999px`, Padding: `2px 8px`. Font: Inter 11px / 500.
- Status variants: tinted at 10% opacity of status color, text in status color.

### Chat input

- Background: `#141728`, Border: `1px solid rgba(255,255,255,0.08)`, Radius: `8px`.
- Min-height: `44px`, Padding: `12px 14px`. Font: Inter 14px / 400.
- Focus: border `rgba(94,138,255,0.4)`, ring `0 0 0 3px rgba(94,138,255,0.08)`.

### Session list item

- Padding: `10px 12px`, Radius: `6px`.
- Hover: `rgba(255,255,255,0.04)`. Active: `rgba(94,138,255,0.08)` with left 2px indigo border.
- Title: Inter 13px / 500, `#e8eaf0` (truncated). Timestamp: 11px / 400, `#6b7088`.

## 5. Layout Principles

### Grid

- **Overall**: sidebar `260px` fixed | main area `flex-1`. Full viewport height `100vh`.
- **Sidebar**: fixed width, scrolls independently.
- **Main area**: centered content max-width `780px`, vertically scrolling.
- Content padding: `24px`.

### Spacing system

Base unit: `4px`. Scale: `4, 8, 12, 16, 20, 24, 32, 40, 48`.

| Context | Value |
|---------|-------|
| Inline element gap | 4-8px |
| Card internal padding | 14-16px |
| Between step cards | 8px |
| Between major sections | 24-32px |

### Section rhythm

The main area flows in vertical bands: incident header, timeline panel, RCA report panel, chat input. Each separated by `24px` gap. No visible dividers between bands.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Recessed | `rgba(0,0,0,0.3) 0px 0px 8px inset` | Code blocks, input fields |
| Flat | bg `#0c0e18` | Main canvas, default surfaces |
| Surface | `#141728` bg + `1px solid rgba(255,255,255,0.06)` | Step cards, panels |
| Elevated | `rgba(0,0,0,0.3) 0px 4px 12px` | Dropdowns, tooltips, modals |

**Philosophy**: Depth is communicated through background luminance steps, not shadow darkness. Shadows are reserved for truly floating elements.

## 7. Motion & Interaction

- **Step appearance**: New Timeline steps fade in + slide up 4px over 200ms (`ease-out`).
- **Status dot pulse**: Running state pulses opacity 1.0 to 0.4 to 1.0 over 1.5s infinite.
- **Expand/collapse**: Step card body transitions `max-height` over 200ms.
- **No parallax, no scroll animations, no decorative motion.** Motion communicates state changes only.

## 8. Do's and Don'ts

### Do
- Use the declared color tokens exclusively via CSS variables.
- Maintain Inter for prose, JetBrains Mono for data.
- Reserve indigo accent for interactive elements only.
- Use status colors semantically (green/amber/rose/sky = operational meaning).
- Keep borders semi-transparent white.
- Communicate elevation through luminance steps.

### Don't
- Don't use pure black (`#000000`).
- Don't use purple-blue gradients, decorative orbs, or blurred blobs.
- Don't put more than 3 accent-color elements per viewport.
- Don't use weight 700+ in UI text.
- Don't mix code and prose typography.
- Don't add decorative box-shadows to surfaces.

## 9. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | <768px | Sidebar collapses to drawer. Single column. Input docked bottom. |
| Tablet | 768-1024px | Sidebar visible (220px). Full-width cards. |
| Desktop | 1024-1440px | Standard 260px sidebar + main area. |
| Wide | >1440px | Content max-width `780px` centered, generous margins. |

## 10. Agent Prompt Guide

### Quick reference

```
Background: #0a0c14 (app), #0e1020 (sidebar), #0c0e18 (main), #141728 (surface)
Text: #e8eaf0 (primary), #a0a6b8 (secondary), #6b7088 (tertiary)
Accent: #5e8aff (primary), #7aa1ff (hover)
Status: #10b981 (ok), #f59e0b (warning), #f43f5e (error), #38bdf8 (info)
Border: rgba(255,255,255,0.06) subtle, 0.08 standard, 0.12 emphasis
Font: Inter (400/500/600), JetBrains Mono (code/data)
```

### Component recipe

- Step card: `#141728` bg, `1px solid rgba(255,255,255,0.06)` border, `8px` radius, `14px 16px` padding. Left border 2px in status color. Header row with probe icon + name + status dot + latency badge. Collapsible body.
- Code block: `#0a0c14` bg, `1px solid rgba(255,255,255,0.06)` border, `6px` radius, `12px 14px` padding, JetBrains Mono 13px.
- Status badge: `rgba(status_color, 0.1)` bg, status color text, `9999px` radius, `2px 8px` padding, Inter 11px/500.

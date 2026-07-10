# Execution Lock — AI SRE Investigator Pitch Deck
## canvas
- viewBox: 0 0 1280 720
- format: PPT 16:9
## expectation_contract
- brief_mode: source-first
- risk_level: green
- score: 88
- source_adequacy: substantive
- ready_for_production: true
- known_intent: 中文内部技术评审立项汇报，正式可编辑 PPTX
- assumptions: editable PPTX; Microsoft YaHei; 纯 schematic SVG; source-first
## visual_direction
- id: custom
- benchmark: Tech-infra consulting deck with schematic architecture, timeline/chain motifs, navy-and-teal discipline; no SaaS gloss.
- theme_art_direction: 诊断台 · 排障链路
- theme_motif: timeline 节点链; 证据面板; 波形 / Trace; chevron NL→QL; 控制台栅格淡线
- theme_scope: cover+section+tail
- title_treatment: motif-integrated framing on cover; restrained title on body
- serious_context_exception: 内部技术评审仅封面/closing 浓墨
- release_boundary: 无外部品牌资产; Mimir/Loki/Tempo 开源引用文字 lockup
## brand_assets
- ai-sre-investigator: required | text: AI SRE Investigator | state: text-lockup-fallback | file: inline wordmark | source: project README | pages: P01,P05,P12
- mimir: required | text: Mimir | state: text-lockup-fallback | source: Grafana OSS reference (PRD/ADR) | pages: P03,P05,P06,P09
- loki: required | text: Loki | state: text-lockup-fallback | source: Grafana OSS reference (PRD/ADR) | pages: P03,P05,P06,P09
- tempo: required | text: Tempo | state: text-lockup-fallback | source: Grafana OSS reference (PRD/ADR) | pages: P03,P05,P06,P09
## colors
- bg: #FFFFFF
- secondary_bg: #F4F6FA
- dark_surface: #0F2A44
- primary: #0F2A44
- accent: #00A6A6
- secondary_accent: #4A6FA5
- text: #1A2332
- text_secondary: #5A6B7E
- text_tertiary: #8896A6
- border: #E2E8F0
- success: #2E7D32
- warning: #C62828
- node_chip_bg: #E6F4F4
- text_on_dark: #A8C0DA
- text_on_dark_muted: #8896A6
## typography
- font_family: Microsoft YaHei, PingFang SC, Arial, sans-serif
- title_family: Microsoft YaHei, PingFang SC, Arial, sans-serif
- code_family: Consolas, Courier New, monospace
- body: 20
- title: 37
- subtitle: 25
- cover_title: 70
- section_title: 50
- annotation: 15
- footer: 12
## aesthetic_checks
- min_body_px: 18
- target_body_px: 20-22
- title_body_ratio: 1.85
- card_title_body_ratio: 1.25
- max_peer_cards_per_slide: 6
- min_card_padding_px: 20
- theme_art_direction: required
- title_art_treatment: motif-integrated-cover-only
- cover_tail_motif: required
- whitespace_strategy: one dominant quiet zone per page
- logo_strategy: text-lockup-fallback
- polish_risks: 12-page-card-grid-uniformity; ADR-as-text-wall; decorative-icons-without-semantics; body-below-18
## icons
- library: chunk-filled
- inventory: robot, magnifying-glass, code-block, database, server, waveform, bolt, cog, chart-line, users, shield-check, octagon-exclamation, circle-checkmark, clock, git-branch, target, lightbulb, share-nodes, lock-closed, key
## images
- none
## page_rhythm
- P01: anchor
- P02: dense
- P03: dense
- P04: breathing
- P05: dense
- P06: dense
- P07: dense
- P08: breathing
- P09: dense
- P10: dense
- P11: dense
- P12: anchor
## page_roles
- P01: anchor
- P02: context
- P03: evidence
- P04: anchor
- P05: process
- P06: process
- P07: process
- P08: risk
- P09: evidence
- P10: context
- P11: action
- P12: closing
## visual_weight
- P01: hero
- P02: high
- P03: medium
- P04: hero
- P05: high
- P06: high
- P07: high
- P08: medium
- P09: high
- P10: medium
- P11: medium
- P12: hero
## layout_family
- P01: cover_brand
- P02: statement_plus_evidence
- P03: comparison_matrix
- P04: hero_statement
- P05: architecture_schematic
- P06: process_chain
- P07: process_stack
- P08: risk_callout
- P09: timeline_demo
- P10: stack_table
- P11: roadmap_timeline
- P12: closing_commitment
## page_recipes
- P01: cover_brand.hero_left_visual
- P02: statement_plus_evidence.left_rule_panel
- P03: comparison_matrix.two_column_delta
- P04: hero_statement.three_support_blocks
- P05: architecture_schematic.three_layer_stack
- P06: process_chain.horizontal_steps
- P07: process_stack.four_layer_wrapper
- P08: risk_callout.qa_stack
- P09: timeline_demo.six_step_chain
- P10: stack_table.two_column_grid
- P11: roadmap_timeline.phase_strip
- P12: closing_commitment.brand_tail
## visual_layers
- P01: schematic-motif
- P02: none
- P03: none
- P04: subtle-rule-line
- P05: schematic-architecture
- P06: schematic-process
- P07: schematic-stack
- P08: none
- P09: schematic-timeline
- P10: none
- P11: schematic-gantt
- P12: schematic-motif-tail
## raster_policy
- P01: allowed-cover
- P02: prohibited-formal-body
- P03: prohibited-formal-body
- P04: prohibited-formal-body
- P05: prohibited-formal-body
- P06: prohibited-formal-body
- P07: prohibited-formal-body
- P08: prohibited-formal-body
- P09: prohibited-formal-body
- P10: prohibited-formal-body
- P11: prohibited-formal-body
- P12: allowed-section-tail
## asset_requirements
- P01: schematic
- P02: none
- P03: none
- P04: none
- P05: schematic
- P06: schematic
- P07: schematic
- P08: none
- P09: schematic
- P10: none
- P11: schematic
- P12: schematic
## anti_patterns
- P01: fake-logo;missing-motif
- P02: vague-context
- P03: same-density-both-sides
- P04: cluttered-support
- P05: disconnected-layers
- P06: no-flow-direction
- P07: same-icon-every-row
- P08: buried-risk
- P09: skipped-step
- P10: vague-stack
- P11: optimistic-timeline
- P12: empty-thank-you
## page_layouts
- none — full deck free design
## page_charts
- none — no data-visualization pages
## forbidden
- Mixing icon libraries; rgba(); <style>; class; <foreignObject>; textPath; @font-face; <animate*>; <script>; <iframe>; <symbol>+<use>; <g opacity>; HTML named entities (use raw Unicode)

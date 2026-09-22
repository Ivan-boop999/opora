import { useTheme } from 'next-themes'

/**
 * Авторская SVG-сцена сада. Растения собраны процедурно: вид задаёт силуэт,
 * стадия (1–5) — высоту, число листьев и цветение. Всё в текущей палитре тем,
 * поэтому сад одинаково живой днём и вечером.
 */

export type SceneVariant = 'dawn' | 'day' | 'dusk'

const speciesOrder = ['sprout', 'fern', 'bush', 'blossom', 'succulent', 'tree'] as const
export type Species = (typeof speciesOrder)[number]

export const speciesLabels: Record<Species, string> = {
  sprout: 'Травянистый росток',
  fern: 'Папоротник',
  bush: 'Небольшой куст',
  blossom: 'Цветущее растение',
  succulent: 'Суккулент',
  tree: 'Миниатюрное дерево',
}

export function GardenScene({
  plants,
  variant,
  className,
  animate = true,
}: {
  plants: { species: string; stage: number; slot: number }[]
  variant?: SceneVariant
  className?: string
  animate?: boolean
}) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const scene = variant ?? 'day'

  const palette = scenePalettes[scene][dark ? 'dark' : 'light']

  const slots = [...plants].sort((a, b) => a.slot - b.slot).slice(0, 8)

  return (
    <svg
      viewBox="0 0 640 360"
      className={className}
      role="img"
      aria-label={`Сад: ${slots.length} растений`}
    >
      <defs>
        <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skyTop} />
          <stop offset="100%" stopColor={palette.skyBottom} />
        </linearGradient>
        <radialGradient id="garden-glow" cx="0.68" cy="0.3" r="0.5">
          <stop offset="0%" stopColor={palette.glow} stopOpacity="0.7" />
          <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="garden-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.soilTop} />
          <stop offset="100%" stopColor={palette.soilBottom} />
        </linearGradient>
      </defs>

      <rect width="640" height="360" fill="url(#garden-sky)" />
      <rect width="640" height="360" fill="url(#garden-glow)" />

      {/* Далёкие холмы */}
      <path d="M0 232 Q 120 196 260 226 T 640 218 V 360 H 0 Z" fill={palette.hill} opacity="0.55" />
      <path d="M0 252 Q 180 224 340 248 T 640 244 V 360 H 0 Z" fill={palette.hill} opacity="0.8" />

      {/* Почва */}
      <path d="M0 276 Q 320 250 640 276 V 360 H 0 Z" fill="url(#garden-soil)" />
      <ellipse cx="320" cy="352" rx="360" ry="26" fill={palette.soilShadow} opacity="0.5" />

      {/* Камни */}
      <g fill={palette.stone}>
        <ellipse cx="96" cy="316" rx="26" ry="14" />
        <ellipse cx="104" cy="310" rx="12" ry="9" opacity="0.7" />
        <ellipse cx="536" cy="322" rx="20" ry="11" />
        <ellipse cx="556" cy="306" rx="9" ry="7" opacity="0.7" />
      </g>

      {/* Мягкий свет */}
      <circle cx="436" cy="86" r="30" fill={palette.sun} opacity="0.9" />
      <circle cx="436" cy="86" r="46" fill={palette.sun} opacity="0.25" />

      {/* Растения по слотам */}
      {slots.map((plant, index) => {
        const layout = slotLayout(plant.slot)
        return (
          <g key={index} transform={`translate(${layout.x}, ${layout.y}) scale(${layout.scale})`}>
            <Plant species={plant.species as Species} stage={plant.stage} palette={palette} animate={animate} />
          </g>
        )
      })}
    </svg>
  )
}

function slotLayout(slot: number): { x: number; y: number; scale: number } {
  const positions = [
    { x: 150, y: 292, scale: 1 },
    { x: 252, y: 300, scale: 1.1 },
    { x: 348, y: 288, scale: 1 },
    { x: 448, y: 302, scale: 1.05 },
    { x: 84, y: 314, scale: 0.85 },
    { x: 204, y: 322, scale: 0.9 },
    { x: 306, y: 316, scale: 0.9 },
    { x: 560, y: 318, scale: 0.88 },
  ]
  return positions[slot % positions.length]!
}

type Palette = {
  skyTop: string
  skyBottom: string
  glow: string
  hill: string
  soilTop: string
  soilBottom: string
  soilShadow: string
  stone: string
  sun: string
  stem: string
  leaf: string
  leafDeep: string
  flower: string
  flowerCore: string
  pot: string
  soil: string
}

const scenePalettes: Record<SceneVariant, { light: Palette; dark: Palette }> = {
  day: {
    light: {
      skyTop: '#DCE8D7',
      skyBottom: '#F5F3ED',
      glow: '#F5E9CF',
      hill: '#C9D8C4',
      soil: '#D9C9B2',
      soilTop: '#D9C9B2',
      soilBottom: '#C4B096',
      soilShadow: '#8f8371',
      stone: '#B9BDB3',
      sun: '#F2E7CE',
      stem: '#4E7A5F',
      leaf: '#6FA07E',
      leafDeep: '#365F50',
      flower: '#EBC6A3',
      flowerCore: '#F2E0C4',
      pot: '#C98D5F',
    },
    dark: {
      skyTop: '#0F1915',
      skyBottom: '#1B2A24',
      glow: '#3A5244',
      hill: '#22352C',
      soil: '#3A3A2E',
      soilTop: '#3A3A2E',
      soilBottom: '#2A2A20',
      soilShadow: '#14140E',
      stone: '#3E4A42',
      sun: '#D8CBA4',
      stem: '#5F8A6E',
      leaf: '#7FA98C',
      leafDeep: '#4A7260',
      flower: '#DDB78F',
      flowerCore: '#E8D2AC',
      pot: '#9A7050',
    },
  },
  dawn: {
    light: {
      skyTop: '#DDD9EA',
      skyBottom: '#F5F1E8',
      glow: '#F3DFC4',
      hill: '#C9D0C6',
      soil: '#D6C6B4',
      soilTop: '#D6C6B4',
      soilBottom: '#BEAB94',
      soilShadow: '#8a8071',
      stone: '#B5BAB4',
      sun: '#F4DFB8',
      stem: '#558066',
      leaf: '#79A587',
      leafDeep: '#3B6353',
      flower: '#E5BFA8',
      flowerCore: '#F0E0CE',
      pot: '#C4886A',
    },
    dark: {
      skyTop: '#141824',
      skyBottom: '#20281F',
      glow: '#4A4A5C',
      hill: '#242E33',
      soil: '#38352B',
      soilTop: '#38352B',
      soilBottom: '#26241C',
      soilShadow: '#12110C',
      stone: '#3C4448',
      sun: '#CDBFA0',
      stem: '#5E8770',
      leaf: '#82A692',
      leafDeep: '#4C7262',
      flower: '#D2AE96',
      flowerCore: '#DECDB8',
      pot: '#96685A',
    },
  },
  dusk: {
    light: {
      skyTop: '#C9C4A8',
      skyBottom: '#EFE3CE',
      glow: '#EBC6A3',
      hill: '#B8C0AC',
      soil: '#CBBA9F',
      soilTop: '#CBBA9F',
      soilBottom: '#B29D80',
      soilShadow: '#847A65',
      stone: '#AFAFA6',
      sun: '#E8B77E',
      stem: '#4A6E55',
      leaf: '#6C9470',
      leafDeep: '#33513F',
      flower: '#DE9F7E',
      flowerCore: '#EFD3AE',
      pot: '#B87B54',
    },
    dark: {
      skyTop: '#10151A',
      skyBottom: '#232A22',
      glow: '#4C3F33',
      hill: '#1F2A26',
      soil: '#332F26',
      soilTop: '#332F26',
      soilBottom: '#211F18',
      soilShadow: '#0F0E0A',
      stone: '#39423E',
      sun: '#D9A87B',
      stem: '#5A7F68',
      leaf: '#7C9E85',
      leafDeep: '#486B5C',
      flower: '#D3A183',
      flowerCore: '#E2CBA9',
      pot: '#8F6650',
    },
  },
}

/** Одно растение: вид × стадия. Растёт плавно — от ростка к зрелой форме. */
export function Plant({
  species,
  stage,
  palette,
  animate = true,
}: {
  species: Species
  stage: number
  palette: Palette
  animate?: boolean
}) {
  const growth = (stage - 1) / 4 // 0..1
  const sway = animate ? 'animate-sway' : ''

  const stemHeight = 18 + growth * 62
  const baseY = 0
  const topY = baseY - stemHeight

  return (
    <g className={sway}>
      {/* Тень у корней */}
      <ellipse cx="0" cy={baseY + 4} rx={16 + growth * 14} ry={5} fill={palette.soilShadow} opacity="0.35" />

      {species === 'sprout' && <Sprout growth={growth} palette={palette} topY={topY} />}
      {species === 'fern' && <Fern growth={growth} palette={palette} topY={topY} />}
      {species === 'bush' && <Bush growth={growth} palette={palette} baseY={baseY} />}
      {species === 'blossom' && (
        <Blossom growth={growth} palette={palette} topY={topY} stage={stage} />
      )}
      {species === 'succulent' && <Succulent growth={growth} palette={palette} baseY={baseY} />}
      {species === 'tree' && <Tree growth={growth} palette={palette} baseY={baseY} stage={stage} />}
    </g>
  )
}

function Stem({ palette, topY, curve = 6 }: { palette: Palette; topY: number; curve?: number }) {
  return (
    <path
      d={`M0 0 Q ${curve} ${topY / 2} 0 ${topY}`}
      stroke={palette.stem}
      strokeWidth={3.4}
      fill="none"
      strokeLinecap="round"
    />
  )
}

function LeafPair({
  palette,
  y,
  size,
  flip = false,
}: {
  palette: Palette
  y: number
  size: number
  flip?: boolean
}) {
  const dir = flip ? -1 : 1
  return (
    <g>
      <path
        d={`M0 ${y} Q ${dir * size * 1.4} ${y - size * 0.9} ${dir * size * 2.1} ${y - size * 0.1} Q ${dir * size} ${y + size * 0.35} 0 ${y}`}
        fill={palette.leaf}
      />
    </g>
  )
}

function Sprout({ growth, palette, topY }: { growth: number; palette: Palette; topY: number }) {
  return (
    <g>
      <Stem palette={palette} topY={topY} />
      <LeafPair palette={palette} y={topY * 0.45} size={7 + growth * 7} />
      <LeafPair palette={palette} y={topY * 0.7} size={6 + growth * 6} flip />
      {growth > 0.5 ? (
        <circle cx="0" cy={topY - 4} r={4.5} fill={palette.leafDeep} opacity="0.85" />
      ) : null}
    </g>
  )
}

function Fern({ growth, palette, topY }: { growth: number; palette: Palette; topY: number }) {
  const fronds = 3 + Math.round(growth * 4)
  const stemHeight = -topY
  return (
    <g>
      {Array.from({ length: fronds }).map((_, index) => {
        const angle = -70 + (index * 140) / (fronds - 1)
        const length = stemHeight * (0.65 + growth * 0.5)
        return (
          <path
            key={index}
            d={`M0 0 Q ${Math.sin((angle * Math.PI) / 180) * length * 0.6} ${topY * 0.6} ${Math.sin((angle * Math.PI) / 180) * length} ${topY * 0.75 - growth * 10}`}
            stroke={palette.leafDeep}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
          />
        )
      })}
      <Stem palette={palette} topY={topY} />
    </g>
  )
}

function Bush({ growth, palette, baseY }: { growth: number; palette: Palette; baseY: number }) {
  const size = 16 + growth * 34
  return (
    <g>
      <path d={`M0 ${baseY} Q ${-size} ${baseY - size * 0.2} ${-size * 0.7} ${baseY - size * 0.85} Q 0 ${baseY - size * 1.25} ${size * 0.7} ${baseY - size * 0.85} Q ${size} ${baseY - size * 0.2} 0 ${baseY}`} fill={palette.leafDeep} />
      <path d={`M0 ${baseY} Q ${-size * 0.6} ${baseY - size * 0.5} ${-size * 0.25} ${baseY - size * 0.95} Q ${size * 0.2} ${baseY - size * 1.05} ${size * 0.5} ${baseY - size * 0.6} Q ${size * 0.55} ${baseY - size * 0.2} 0 ${baseY}`} fill={palette.leaf} />
      {growth > 0.6 ? (
        <>
          <circle cx={-size * 0.3} cy={baseY - size * 0.8} r={3.4} fill={palette.flower} />
          <circle cx={size * 0.25} cy={baseY - size * 0.65} r={3} fill={palette.flower} />
        </>
      ) : null}
    </g>
  )
}

function Blossom({
  growth,
  palette,
  topY,
  stage,
}: {
  growth: number
  palette: Palette
  topY: number
  stage: number
}) {
  const bloom = stage >= 3
  return (
    <g>
      <Stem palette={palette} topY={topY} />
      <LeafPair palette={palette} y={topY * 0.5} size={9 + growth * 6} />
      <LeafPair palette={palette} y={topY * 0.75} size={8 + growth * 5} flip />
      {bloom ? (
        <g transform={`translate(0, ${topY})`}>
          {Array.from({ length: 5 }).map((_, index) => {
            const angle = (index * 360) / 5
            return (
              <ellipse
                key={index}
                cx="0"
                cy={-(7 + growth * 3)}
                rx={4.5 + growth}
                ry={7 + growth * 3.5}
                fill={palette.flower}
                transform={`rotate(${angle})`}
              />
            )
          })}
          <circle cx="0" cy="0" r={3.4} fill={palette.flowerCore} />
        </g>
      ) : (
        <circle cx="0" cy={topY - 3} r={5} fill={palette.leafDeep} />
      )}
    </g>
  )
}

function Succulent({ growth, palette, baseY }: { growth: number; palette: Palette; baseY: number }) {
  const size = 10 + growth * 16
  return (
    <g>
      <ellipse cx="0" cy={baseY - size * 0.25} rx={size * 0.85} ry={size * 0.5} fill={palette.leafDeep} />
      {Array.from({ length: 5 }).map((_, index) => {
        const angle = -60 + index * 30
        return (
          <ellipse
            key={index}
            cx="0"
            cy={baseY - size * 0.55}
            rx={size * 0.22}
            ry={size * 0.55}
            fill={palette.leaf}
            transform={`rotate(${angle}, 0, ${baseY - size * 0.25})`}
          />
        )
      })}
      <ellipse cx="0" cy={baseY - size * 0.95} rx={size * 0.2} ry={size * 0.3} fill={palette.leaf} />
    </g>
  )
}

function Tree({ growth, palette, baseY, stage }: { growth: number; palette: Palette; baseY: number; stage: number }) {
  const height = 26 + growth * 58
  const crown = 14 + growth * 26
  return (
    <g>
      <path
        d={`M-3.5 ${baseY} L -2 ${baseY - height * 0.6} L 2 ${baseY - height * 0.6} L 3.5 ${baseY} Z`}
        fill={palette.pot}
      />
      <path d={`M0 ${baseY - height * 0.6} L 0 ${baseY - height}`} stroke={palette.pot} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="0" cy={baseY - height} r={crown * 0.62} fill={palette.leafDeep} />
      <circle cx={-crown * 0.34} cy={baseY - height + crown * 0.2} r={crown * 0.44} fill={palette.leafDeep} />
      <circle cx={crown * 0.3} cy={baseY - height + crown * 0.16} r={crown * 0.4} fill={palette.leaf} />
      <circle cx={-crown * 0.1} cy={baseY - height - crown * 0.24} r={crown * 0.4} fill={palette.leaf} />
      {stage >= 4 ? (
        <>
          <circle cx={-crown * 0.4} cy={baseY - height + crown * 0.42} r={3} fill={palette.flower} />
          <circle cx={crown * 0.36} cy={baseY - height - crown * 0.3} r={2.6} fill={palette.flower} />
          <circle cx={crown * 0.05} cy={baseY - height + crown * 0.55} r={2.4} fill={palette.flower} />
        </>
      ) : null}
    </g>
  )
}

/** Мини-версия для главного экрана. */
export function GardenMini({ species, stage }: { species: string; stage: number }) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const palette = scenePalettes.day[dark ? 'dark' : 'light']
  return (
    <svg viewBox="-30 -96 60 104" className="h-16 w-16" aria-hidden="true">
      <ellipse cx="0" cy="4" rx="20" ry="5" fill={palette.soil} />
      <g transform="translate(0, 2)">
        <Plant species={species as Species} stage={stage} palette={palette} />
      </g>
    </svg>
  )
}

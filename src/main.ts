import './style.css'

// The only creature in this presentation prototype.
const ace = {
  name: 'Ace', level: 1, role: 'Striker', size: 'Medium',
  description: 'placeholder',
  statGroups: [
    [{ label: 'Perception', value: '+10', color: 'black' }],
    [
      { label: 'AC', value: '13', color: 'blue' },
      { label: 'HP', value: '15', color: 'red' },
    ],
    [
      { label: 'Fort', value: '+4', color: 'green' },
      { label: 'Reflex', value: '+10', color: 'yellow' },
      { label: 'Will', value: '+7', color: 'purple' },
    ],
    [{ label: 'Speed', value: '40 feet', color: 'black' }],
  ],
  attack: { name: 'Ranged Strike', kind: 'strike', action: 'One action', mark: '◆', meta: 'Range 60 feet', text: '<strong>Attack</strong> +9; <strong>Damage</strong> 1d6+2 piercing.' },
  tactics: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  abilities: [
    { name: 'Mirror Image', kind: 'technique', action: 'Two actions', mark: '◆◆', meta: 'Illusion · once per encounter · 1 minute', text: 'Three illusory copies surround the Ace. When an attack would hit, it hits the Ace only on a 1 in 4 chance with three copies, 1 in 3 with two, or 1 in 2 with one; otherwise it destroys a copy. A miss that is not a critical failure also destroys a copy. A critical hit assigned to a copy destroys it and hits the Ace as a normal success.' },
  ],
} as const

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root is missing')

const renderCard = (card: { name: string; kind: string; action: string; mark: string; meta: string; text: string }) => `
  <section class="ability ability--${card.kind}" aria-label="${card.name}">
    <div class="ability-head"><div class="ability-name-row"><h3>${card.name}</h3><span class="action-mark" role="img" aria-label="${card.action}">${card.mark}</span></div><p class="ability-meta">${card.meta}</p></div>
    <p class="ability-text">${card.text}</p>
  </section>`

app.innerHTML = `
  <article class="creature-sheet" aria-labelledby="creature-name">
    <div class="top-grid">
      <header class="identity">
        <div class="role-row">
          <svg class="crest" viewBox="0 0 48 54" fill="none" aria-hidden="true">
            <path d="M24 2C17 7 9 8 3 8v18c0 13 9 21 21 26 12-5 21-13 21-26V8C39 8 31 7 24 2Z" fill="currentColor"/>
            <path d="M24 9v35c-9-5-14-11-14-20V14c5-.5 10-2 14-5Z" fill="white"/>
          </svg>
          <p class="role">${ace.role}</p>
        </div>
        <h1 id="creature-name">${ace.name}</h1>
        <dl class="size-row"><div class="stat-row stat-row--black"><dt>Size</dt><dd>${ace.size}</dd></div></dl>
      </header>

      <section class="base-block" aria-label="Base stats">
        <div class="stat-list">${ace.statGroups.map((group) => `
          <dl class="stat-group">${group.map((stat) => `
            <div class="stat-row stat-row--${stat.color}"><dt>${stat.label}</dt><dd>${stat.value}</dd></div>
          `).join('')}</dl>
        `).join('')}</div>
      </section>
    </div>

    <div class="sheet-body">
      <section class="description" aria-labelledby="description-heading"><div class="section-heading"><h2 id="description-heading">Description</h2></div><p>${ace.description}</p></section>

      <section class="tactics" aria-labelledby="tactics-heading"><div class="section-heading"><h2 id="tactics-heading">Tactics</h2></div><p>${ace.tactics}</p></section>

      <section class="abilities" aria-labelledby="abilities-heading">
        <div class="section-heading"><h2 id="abilities-heading">Abilities</h2></div>
        <div class="ability-list">${[ace.attack, ...ace.abilities].map(renderCard).join('')}</div>
      </section>
    </div>
  </article>
`

import './style.css'

const countDisplay = document.querySelector<HTMLParagraphElement>('#count')
const incrementButton = document.querySelector<HTMLButtonElement>('#increment')

if (!countDisplay || !incrementButton) {
  throw new Error('Counter elements are missing from the page.')
}

let count = 0

incrementButton.addEventListener('click', () => {
  count += 1
  countDisplay.textContent = String(count)
})

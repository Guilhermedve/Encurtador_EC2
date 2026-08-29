export function ScissorsFallback() {
  return (
    <div
      aria-hidden="true"
      className="scissors-fallback pointer-events-none absolute inset-0 grid place-items-center overflow-hidden text-white/55"
    >
      <pre className="text-[clamp(0.58rem,1.15vw,0.9rem)] leading-none">
{`  .------.       .------.
  /  .--.  \\     /  .--.  \\
 |  (    )  |   |  (    )  |
  \\  '--'  /     \\  '--'  /
   '------' \\     / '------'
             \\   /
              \\ /
               X
              / \\
             /   \\
            /     \\`}
      </pre>
    </div>
  )
}

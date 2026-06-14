/**
 * Divider — Decorative gold gradient line with centered diamond dot.
 * Used between sections on the Zenitha Luxury homepage.
 */
export function Divider() {
  return (
    <div
      style={{
        width: '100%',
        height: '1px',
        background:
          'linear-gradient(90deg, transparent, rgba(196, 169, 108, 0.1), transparent)',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          width: '6px',
          height: '6px',
          background: 'var(--zl-gold-deep)',
        }}
      />
    </div>
  );
}

import { ITEMS } from "../game/items";

function renderCount(amount) {
  return amount > 1 ? <span className="item-count">{amount}</span> : null;
}

export default function ItemSlot({
  stack,
  label,
  selected = false,
  output = false,
  renderItem,
  onMouseDown,
  onMouseEnter,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  const item = stack ? ITEMS[stack.itemId] : null;

  return (
    <button
      type="button"
      className={`item-slot ${selected ? "is-selected" : ""} ${output ? "is-output" : ""} ${!stack ? "is-empty" : ""}`}
      draggable={draggable}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown?.(event);
      }}
      onMouseEnter={onMouseEnter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={item ? `${item.name} x${stack.amount}` : label}
    >
      {item ? renderItem(item) : <span className="empty-slot" />}
      {stack ? renderCount(stack.amount) : null}
      {label ? <span className="slot-key">{label}</span> : null}
    </button>
  );
}

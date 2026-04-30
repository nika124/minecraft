import ItemSlot from "./ItemSlot";

export default function CraftingGrid({
  title,
  size,
  slots,
  output,
  renderItem,
  onSlotMouseDown,
  onSlotMouseEnter,
  onOutputMouseDown,
}) {
  return (
    <div className="crafting-table">
      <div className="inventory-section-heading">
        <span>{title}</span>
      </div>
      <div className="crafting-layout">
        <div
          className="crafting-slots"
          style={{ gridTemplateColumns: `repeat(${size}, 48px)` }}
        >
          {slots.map((slot, index) => (
            <ItemSlot
              key={index}
              stack={slot}
              label=""
              renderItem={renderItem}
              onMouseDown={(event) =>
                onSlotMouseDown(index, event.button, event.ctrlKey)
              }
              onMouseEnter={(event) =>
                onSlotMouseEnter?.(index, event.buttons, event.ctrlKey)
              }
            />
          ))}
        </div>
        <span className="crafting-arrow" aria-hidden="true">
          &gt;
        </span>
        <ItemSlot
          stack={
            output ? { itemId: output.itemId, amount: output.amount } : null
          }
          label=""
          output
          renderItem={renderItem}
          onMouseDown={(event) =>
            onOutputMouseDown(event.button, event.ctrlKey)
          }
        />
      </div>
    </div>
  );
}

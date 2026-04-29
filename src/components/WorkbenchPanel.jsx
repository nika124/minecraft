import InventoryPanel from "./InventoryPanel";

void InventoryPanel;

export default function WorkbenchPanel(props) {
  return (
    <InventoryPanel
      {...props}
      craftingTitle="Workbench"
      craftingSize={3}
      panelTitle="Workbench"
      panelSubtitle="Use the 3x3 grid for tools, ladders, walls, and larger recipes."
    />
  );
}

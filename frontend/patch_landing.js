import fs from 'fs';

const filePath = 'c:/Users/USER/Documents/calservices/calservices/frontend/src/ui/pages/LandingPage.jsx';
let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

let targetIndex = -1;
for (let i = 6500; i < 6570 && i < lines.length; i++) {
  if (lines[i].includes('<div>') && lines[i-1] && lines[i-1].includes('>')) {
    targetIndex = i;
    break;
  }
}

console.log('Found line at:', targetIndex, lines[targetIndex]);

if (targetIndex !== -1) {
  lines[targetIndex] = `                                      <div
                                        onClick={() => {
                                          if (selectedFoodSubModule?.id === "vegetables") {
                                            setSelectedRecipeVegetable(item)
                                            setIsRecipeModalOpen(true)
                                          }
                                        }}
                                        className={selectedFoodSubModule?.id === "vegetables" ? "cursor-pointer" : ""}
                                      >`;
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Successfully updated line in LandingPage.jsx');
}

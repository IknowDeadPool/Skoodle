

function generateServerRandomName() {
  const names = ["Player", "Gamer", "Hero", "Legend", "Voyager", "Rogue"];
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${randomName}_${randomNum}`;
}


module.exports = {generateServerRandomName};
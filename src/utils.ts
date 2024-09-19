export async function waitSeconds(seconds: number): Promise<void> {
  const milisecondsInSecond = 1000;
  await new Promise((resolve) =>
    setTimeout(resolve, seconds * milisecondsInSecond)
  );
}

export function getRandomFloat(min: number, max: number, fixedTo = 6) {
  return Number((Math.random() * (max - min) + min).toFixed(fixedTo));
}

export function shuffleArray(list: any[]) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

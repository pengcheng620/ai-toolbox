function a(m, n) {
    const arr = new Array(m).fill(0).map(() => new Array(n).fill(0));
    let count = 1;
    let i = 0;
    let j = 0;
    let stepI = 0;
    let stepJ = 1;
    while (count <= m * n) {
        arr[i][j] = count++;
        if (i + stepI >= m || i + stepI < 0 || j + stepJ >= n || j + stepJ < 0 || arr[i + stepI][j + stepJ] !== 0) {
            const temp = stepI;
            stepI = stepJ;
            stepJ = -temp;
        }
        i += stepI;
        j += stepJ;
    }
    return arr;
}

console.log(a(4, 5));
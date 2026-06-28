async function test() {
  const res = await fetch('http://localhost:3000/api/products');
  const data = await res.json();
  data.forEach(p => console.log(p.name, p.image));
}
test();

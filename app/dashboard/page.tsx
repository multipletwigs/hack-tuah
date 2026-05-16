import Counter from "./counter";

// Server Component (the default) — can be async, fetch happens on the server
export default async function DashboardPage() {
  const res = await fetch("https://jsonplaceholder.typicode.com/users/1");
  const user = await res.json();

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Data fetched on the server, no JS sent to the client for this part */}
      <p>Logged in as: {user.name}</p>

      {/* Hand off to a Client Component for the interactive bit */}
      <Counter initial={0} />
    </div>
  );
}

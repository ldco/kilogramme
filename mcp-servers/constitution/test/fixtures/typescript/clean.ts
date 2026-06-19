function cleanFunction(): string {
  const x: string = "hello"
  return x
}

function add(a: number, b: number): number {
  return a + b
}

interface User {
  id: string
  name: string
}

async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`)
    const data = await response.json() as User
    return data
  } catch {
    return null
  }
}

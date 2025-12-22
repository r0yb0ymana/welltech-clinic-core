import { login } from './action'

export default function LoginPage() {
  return (
    <form
      action={login}
      style={{ maxWidth: 360, margin: '80px auto' }}
    >
      <h1>Login</h1>

      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        style={{ display: 'block', width: '100%', marginBottom: 12 }}
      />

      <input
        name="password"
        type="password"
        placeholder="Password"
        required
        style={{ display: 'block', width: '100%', marginBottom: 12 }}
      />

      <button type="submit">Sign in</button>
    </form>
  )
}

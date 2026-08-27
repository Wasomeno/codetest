import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <section id="app" data-od-id="app">
      <div className="app-shell">
        <Sidebar />
        {/*
         * The `.main` element is persistent across app-level navigations, so
         * naming it here lets the View Transitions API snapshot it as a
         * single named layer (`app-main`) and crossfade/slide it between
         * routes. Public routes (landing / login / about) render children
         * directly without AppShell, so this transition only runs on
         * authenticated app pages — matching the spec.
         */}
        <main className="main">{children}</main>
      </div>
    </section>
  )
}

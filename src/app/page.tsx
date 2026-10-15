import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import styles from './shutdown.module.css'

// This app has moved to Batch Ascent V2. Every route redirects here —
// see middleware.ts — so there is no login/dashboard left to reach,
// only this notice.
const V2_URL = 'https://hacabatchascent.vercel.app/'

export default function ShutdownNotice() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Image src="/logo-new.png" alt="HACA" width={48} height={48} />
        </div>
        <h1 className={styles.title}>Batch Ascent has moved</h1>
        <p className={styles.subtitle}>This app is no longer in use.</p>

        <div className={styles.block}>
          <h2 className={styles.blockTitle}>Sales Executive / Sales Lead</h2>
          <p>Please log in to the new Batch Ascent using the email and login details sent to you.</p>
          <p>Don&apos;t have access yet? Contact your Sales Lead.</p>
          <a className={styles.link} href={V2_URL}>
            Go to Batch Ascent <ArrowUpRight size={16} />
          </a>
        </div>

        <div className={styles.block}>
          <h2 className={styles.blockTitle}>Academic Lead / SHO / SEM</h2>
          <p>This app is no longer used for your role. Please use the SHO App instead.</p>
        </div>
      </div>
    </div>
  )
}

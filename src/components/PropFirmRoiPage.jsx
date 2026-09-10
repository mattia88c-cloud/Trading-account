import { useState } from 'react'
import PropRoiView from './PropRoiView.jsx'
import PropAnalyticsView from './PropAnalyticsView.jsx'
import PropFirmFinder from './PropFirmFinder.jsx'
import styles from './PropFirmRoiPage.module.css'

export default function PropFirmRoiPage(props) {
  const [subTab, setSubTab] = useState('data')

  return (
    <div className={styles.wrap}>
      <div className={styles.subTabs}>
        <button
          type="button"
          className={`${styles.subTab} ${subTab === 'data' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('data')}
        >
          Inserisci dati
        </button>
        <button
          type="button"
          className={`${styles.subTab} ${subTab === 'analytics' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('analytics')}
        >
          Analytics
        </button>
        <button
          type="button"
          className={`${styles.subTab} ${subTab === 'shopping' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('shopping')}
        >
          Shopping Prop
        </button>
      </div>

      {subTab === 'data' && (
        <PropRoiView
          purchases={props.purchases}
          payouts={props.payouts}
          addPurchase={props.addPurchase}
          deletePurchase={props.deletePurchase}
          addPayout={props.addPayout}
          deletePayout={props.deletePayout}
        />
      )}

      {subTab === 'analytics' && (
        <PropAnalyticsView
          purchases={props.purchases}
          payouts={props.payouts}
          theme={props.theme}
        />
      )}

      {subTab === 'shopping' && <PropFirmFinder />}
    </div>
  )
}

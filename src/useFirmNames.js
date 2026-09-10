import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Elenco di nomi di prop firm salvati dall'utente (es. "Topstep", "5%ers"), condiviso tra il
// form acquisti e quello payout della pagina ROI prop: si aggiunge una volta e da lì in poi è
// selezionabile a bottoni, invece di doverlo riscrivere ogni volta a mano. Salvato su Supabase
// (non più solo in localStorage) così è visibile su qualsiasi browser/dispositivo, non solo su
// quello con cui è stato aggiunto la prima volta.
export function useFirmNames() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    let active = true
    supabase
      .from('prop_firm_names')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Errore caricamento nomi prop firm:', error.message)
          return
        }
        setRows(data)
      })
    return () => { active = false }
  }, [])

  async function addFirmName(name) {
    const trimmed = name.trim()
    if (!trimmed || rows.some((r) => r.name === trimmed)) return
    const { data, error } = await supabase
      .from('prop_firm_names')
      .insert({ name: trimmed })
      .select()
      .single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore salvataggio nome prop firm:', error.message)
      return
    }
    setRows((prev) => [...prev, data])
  }

  async function removeFirmName(name) {
    const row = rows.find((r) => r.name === name)
    if (!row) return
    const { error } = await supabase.from('prop_firm_names').delete().eq('id', row.id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore eliminazione nome prop firm:', error.message)
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id))
  }

  // Numero di conti "funded" raggiunti per firm: dato manuale (non derivabile dagli
  // acquisti/payout, che non hanno un ID account collegabile a uno stato) usato per
  // calcolare Pass Rate e Costo per funded nella pagina Performance prop.
  async function setFundedCount(name, fundedCount) {
    const row = rows.find((r) => r.name === name)
    if (!row) return
    const { error } = await supabase
      .from('prop_firm_names')
      .update({ funded_count: fundedCount })
      .eq('id', row.id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore salvataggio funded count:', error.message)
      return
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, funded_count: fundedCount } : r)))
  }

  return {
    firmNames: rows.map((r) => r.name),
    firmRows: rows,
    addFirmName,
    removeFirmName,
    setFundedCount,
  }
}

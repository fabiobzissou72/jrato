'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Plus, Edit, Trash2, Clock, User, DollarSign, CheckCircle, XCircle, UserCheck } from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/utils'

interface Agendamento {
  id: string
  data_agendamento: string
  hora_inicio: string
  nome_cliente: string
  telefone: string
  valor: number
  status: string
  observacoes: string
  compareceu: boolean | null
  checkin_at: string | null
  servicos: { nome: string; preco: number; duracao_minutos: number } | null
  profissionais: { nome: string }
  agendamento_servicos: Array<{
    servicos: { nome: string; preco: number; duracao_minutos: number }
  }>
}

interface Profissional {
  id: string
  nome: string
}

interface Servico {
  id: string
  nome: string
  preco: number
  duracao_minutos: number
}

interface Cliente {
  id: string
  nome_completo: string
  telefone: string
}

type FiltroTemporal = 'hoje' | 'amanha' | 'semana' | 'proximos7' | 'passados' | 'todos' | 'personalizado'
type FiltroStatus = 'todos' | 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado'

type VisualizacaoMode = 'lista' | 'calendario'
type CalendarioView = 'dia' | 'semana' | 'mes'

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filtroTemporal, setFiltroTemporal] = useState<FiltroTemporal>('hoje')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [dataPersonalizada, setDataPersonalizada] = useState('')
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null)
  const [detalhesAgendamento, setDetalhesAgendamento] = useState<Agendamento | null>(null)
  const [visualizacao, setVisualizacao] = useState<VisualizacaoMode>('lista')
  const [calendarioView, setCalendarioView] = useState<CalendarioView>('mes')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date())
  const [currentDay, setCurrentDay] = useState(new Date())
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchCliente, setSearchCliente] = useState('')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [barbeiroRodizio, setBarbeiroRodizio] = useState<{ nome: string; atendimentos: number } | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [editForm, setEditForm] = useState({
    nome_cliente: '',
    telefone: '',
    observacoes: '',
    status: 'agendado',
    data_agendamento: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    profissional_id: '',
    servico_ids: [] as string[],
    cliente_id: ''
  })

  useEffect(() => {
    loadAgendamentos()
    loadProfissionais()
    loadServicos()
  }, [filtroTemporal, filtroStatus, dataPersonalizada])

  const loadProfissionais = async () => {
    const { data } = await supabase
      .from('profissionais')
      .select('id, nome')
      .eq('ativo', true)
    setProfissionais(data || [])
  }

  const loadServicos = async () => {
    const { data } = await supabase
      .from('servicos')
      .select('id, nome, preco, duracao_minutos')
      .eq('ativo', true)
    setServicos(data || [])
  }

  const searchClientes = async (search: string) => {
    if (search.length < 2) {
      setClientes([])
      return
    }
    const { data } = await supabase
      .from('clientes')
      .select('id, nome_completo, telefone')
      .or(`nome_completo.ilike.%${search}%,telefone.ilike.%${search}%`)
      .limit(10)
    setClientes(data || [])
  }

  const buscarClientePorTelefone = async (telefone: string) => {
    if (telefone.length < 8) return

    // Remover caracteres não-numéricos para busca mais flexível
    const telefoneClean = telefone.replace(/\D/g, '')

    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome_completo, telefone')
      .ilike('telefone', `%${telefoneClean}%`)
      .limit(1)

    if (error) {
      console.error('Erro ao buscar cliente:', error)
      return
    }

    if (data && data.length > 0) {
      const cliente = data[0]
      setEditForm({
        ...editForm,
        cliente_id: cliente.id,
        nome_cliente: cliente.nome_completo,
        telefone: cliente.telefone
      })
      alert(`Cliente encontrado: ${cliente.nome_completo}`)
    } else {
      console.log('Cliente não encontrado com este telefone')
    }
  }

  const checkHorariosDisponiveis = async () => {
    if (!editForm.data_agendamento || editForm.servico_ids.length === 0) return

    setCheckingAvailability(true)
    try {
      const barbeiroNome = editForm.profissional_id
        ? profissionais.find(p => p.id === editForm.profissional_id)?.nome
        : null

      const params = new URLSearchParams({
        data: editForm.data_agendamento,
        servico_ids: editForm.servico_ids.join(','),
        ...(barbeiroNome && { barbeiro: barbeiroNome })
      })

      const response = await fetch(`/api/agendamentos/horarios-disponiveis?${params}`)
      const result = await response.json()

      if (result.success) {
        setHorariosDisponiveis(result.data.horarios || [])
      } else {
        setHorariosDisponiveis([])
      }
    } catch (error) {
      console.error('Erro ao verificar horários:', error)
      setHorariosDisponiveis([])
    } finally {
      setCheckingAvailability(false)
    }
  }

  const checkBarbeiroRodizio = async () => {
    if (!editForm.data_agendamento || !editForm.hora_inicio || editForm.servico_ids.length === 0) return
    if (editForm.profissional_id) {
      setBarbeiroRodizio(null)
      return
    }

    try {
      const duracaoTotal = servicos
        .filter(s => editForm.servico_ids.includes(s.id))
        .reduce((sum, s) => sum + s.duracao_minutos, 0)

      const params = new URLSearchParams({
        data: editForm.data_agendamento,
        hora: editForm.hora_inicio,
        duracao: duracaoTotal.toString()
      })

      const response = await fetch(`/api/agendamentos/buscar-barbeiro-rodizio?${params}`)
      const result = await response.json()

      if (result.success && result.data.disponivel) {
        setBarbeiroRodizio({
          nome: result.data.barbeiro_nome,
          atendimentos: result.data.total_atendimentos_hoje
        })
      } else {
        setBarbeiroRodizio(null)
        if (!result.success) {
          alert(result.message || 'Nenhum barbeiro disponível neste horário')
        }
      }
    } catch (error) {
      console.error('Erro ao verificar barbeiro do rodízio:', error)
      setBarbeiroRodizio(null)
    }
  }

  // Verificar horários quando data ou serviços mudarem
  useEffect(() => {
    if (showForm) {
      checkHorariosDisponiveis()
    }
  }, [editForm.data_agendamento, editForm.servico_ids, editForm.profissional_id, showForm])

  // Verificar barbeiro do rodízio quando hora for selecionada
  useEffect(() => {
    if (showForm && editForm.hora_inicio) {
      checkBarbeiroRodizio()
    }
  }, [editForm.hora_inicio, showForm])

  // Funções auxiliares para o calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days = []

    // Dias do mês anterior
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -i)
      days.unshift({
        date: prevMonthDay,
        isCurrentMonth: false,
        dateStr: prevMonthDay.toISOString().split('T')[0]
      })
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, month, day)
      days.push({
        date: currentDay,
        isCurrentMonth: true,
        dateStr: currentDay.toISOString().split('T')[0]
      })
    }

    // Dias do próximo mês
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDay = new Date(year, month + 1, i)
      days.push({
        date: nextMonthDay,
        isCurrentMonth: false,
        dateStr: nextMonthDay.toISOString().split('T')[0]
      })
    }

    return days
  }

  const getAgendamentosPorData = (dateStr: string) => {
    // Filtrar agendamentos pela data (formato YYYY-MM-DD)
    return agendamentos.filter(ag => ag.data_agendamento === dateStr)
  }

  const loadAgendamentos = async () => {
    try {
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          servicos (nome, preco, duracao_minutos),
          profissionais (nome)
        `)
        .order('hora_inicio')

      // Calcular datas baseado no filtro temporal
      const hoje = new Date()
      const hojeStr = hoje.toISOString().split('T')[0]

      let dataFiltro = ''

      switch (filtroTemporal) {
        case 'hoje':
          query = query.eq('data_agendamento', hojeStr)
          break

        case 'amanha':
          const amanha = new Date(hoje)
          amanha.setDate(hoje.getDate() + 1)
          const amanhaStr = amanha.toISOString().split('T')[0]
          query = query.eq('data_agendamento', amanhaStr)
          break

        case 'semana':
          // Domingo até sábado da semana atual
          const inicioSemana = new Date(hoje)
          inicioSemana.setDate(hoje.getDate() - hoje.getDay())
          const fimSemana = new Date(inicioSemana)
          fimSemana.setDate(inicioSemana.getDate() + 6)
          // Para filtro de semana, vamos buscar todos e filtrar em memória
          break

        case 'proximos7':
          // Próximos 7 dias a partir de hoje
          break

        case 'passados':
          // Últimos 30 dias
          break

        case 'personalizado':
          if (dataPersonalizada) {
            query = query.eq('data_agendamento', dataPersonalizada)
          }
          break

        case 'todos':
          // Sem filtro de data
          break
      }

      // Aplicar filtro de status
      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }

      const { data, error } = await query

      if (error) throw error

      // Tentar carregar serviços da tabela de relacionamento (se existir)
      if (data && data.length > 0) {
        for (const agendamento of data) {
          try {
            const { data: servicosData } = await supabase
              .from('agendamento_servicos')
              .select('servicos (nome, preco, duracao_minutos)')
              .eq('agendamento_id', agendamento.id)

            agendamento.agendamento_servicos = servicosData || []
          } catch (err) {
            // Tabela não existe ainda, ignorar
            agendamento.agendamento_servicos = []
          }
        }
      }

      // Filtrar em memória para casos de range de datas
      let agendamentosFiltrados = data || []

      if (filtroTemporal === 'semana' || filtroTemporal === 'proximos7' || filtroTemporal === 'passados') {
        agendamentosFiltrados = agendamentosFiltrados.filter(agendamento => {
          // Converter data YYYY-MM-DD para Date
          const dataAgend = new Date(agendamento.data_agendamento + 'T00:00:00')

          if (filtroTemporal === 'semana') {
            const inicioSemana = new Date(hoje)
            inicioSemana.setDate(hoje.getDate() - hoje.getDay())
            inicioSemana.setHours(0, 0, 0, 0)
            const fimSemana = new Date(inicioSemana)
            fimSemana.setDate(inicioSemana.getDate() + 6)
            fimSemana.setHours(23, 59, 59, 999)
            return dataAgend >= inicioSemana && dataAgend <= fimSemana
          } else if (filtroTemporal === 'proximos7') {
            const hojeInicio = new Date(hoje)
            hojeInicio.setHours(0, 0, 0, 0)
            const proximos7 = new Date(hoje)
            proximos7.setDate(hoje.getDate() + 7)
            proximos7.setHours(23, 59, 59, 999)
            return dataAgend >= hojeInicio && dataAgend <= proximos7
          } else if (filtroTemporal === 'passados') {
            const passados30 = new Date(hoje)
            passados30.setDate(hoje.getDate() - 30)
            passados30.setHours(0, 0, 0, 0)
            const hojeInicio = new Date(hoje)
            hojeInicio.setHours(0, 0, 0, 0)
            return dataAgend >= passados30 && dataAgend < hojeInicio
          }
          return true
        })
      }

      console.log('Agendamentos carregados:', agendamentosFiltrados)
      setAgendamentos(agendamentosFiltrados)
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const marcarComparecimento = async (id: string, compareceu: boolean) => {
    try {
      // Usar a API de confirmação de comparecimento
      const response = await fetch('/api/agendamentos/confirmar-comparecimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agendamento_id: id,
          compareceu: compareceu
        })
      })

      const result = await response.json()

      if (!result.success) {
        alert(result.message || 'Erro ao marcar comparecimento')
        return
      }

      alert(compareceu ? 'Cliente marcado como presente!' : 'Cliente marcado como faltou')
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao marcar comparecimento:', error)
      alert('Erro ao marcar comparecimento')
    }
  }

  const handleDelete = async (id: string) => {
    const motivo = prompt('Motivo do cancelamento:')
    if (!motivo) return

    try {
      // Usar a API de cancelamento com validação de 2h
      const response = await fetch('/api/agendamentos/cancelar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agendamento_id: id,
          motivo: motivo,
          cancelado_por: 'admin',
          forcar: true // Admin pode cancelar a qualquer momento
        })
      })

      const result = await response.json()

      if (!result.success) {
        // Se falhou e tem aviso sobre prazo, perguntar se quer forçar
        if (result.message?.includes('2h')) {
          const confirmarForca = confirm(
            `${result.message}\n\n` +
            `Como administrador, você pode cancelar mesmo assim.\n` +
            `Deseja continuar?`
          )

          if (!confirmarForca) return

          // Tentar novamente forçando
          const responseForca = await fetch('/api/agendamentos/cancelar', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agendamento_id: id,
              motivo: motivo,
              cancelado_por: 'admin',
              forcar: true
            })
          })

          const resultForca = await responseForca.json()
          if (!resultForca.success) {
            alert(resultForca.message || 'Erro ao cancelar agendamento')
            return
          }
        } else {
          alert(result.message || 'Erro ao cancelar agendamento')
          return
        }
      }

      alert(`Agendamento cancelado!\n${result.data?.webhook_enviado ? '✅ Cliente notificado' : ''}`)
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
      alert('Erro ao cancelar agendamento')
    }
  }

  const handleEdit = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento)
    setEditForm({
      nome_cliente: agendamento.nome_cliente,
      telefone: agendamento.telefone || '',
      observacoes: agendamento.observacoes || '',
      status: agendamento.status,
      data_agendamento: agendamento.data_agendamento,
      hora_inicio: agendamento.hora_inicio,
      profissional_id: '',
      servico_ids: [],
      cliente_id: ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingAgendamento) return

    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          nome_cliente: editForm.nome_cliente,
          telefone: editForm.telefone,
          observacoes: editForm.observacoes,
          status: editForm.status
        })
        .eq('id', editingAgendamento.id)

      if (error) throw error

      alert('Agendamento atualizado com sucesso!')
      setEditingAgendamento(null)
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
      alert('Erro ao atualizar agendamento')
    }
  }

  const handleAddAgendamento = async () => {
    try {
      if (editForm.servico_ids.length === 0) {
        alert('Selecione pelo menos um serviço')
        return
      }

      if (!editForm.nome_cliente || !editForm.data_agendamento || !editForm.hora_inicio) {
        alert('Preencha nome, data e hora')
        return
      }

      // Usar a API de criação de agendamentos com rodízio
      const response = await fetch('/api/agendamentos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome: editForm.nome_cliente,
          telefone: editForm.telefone,
          data: editForm.data_agendamento,
          hora: editForm.hora_inicio,
          servico_ids: editForm.servico_ids,
          barbeiro_preferido: editForm.profissional_id || null,
          observacoes: editForm.observacoes,
          cliente_id: editForm.cliente_id || null
        })
      })

      const result = await response.json()

      if (!result.success) {
        alert(result.message || 'Erro ao criar agendamento')
        return
      }

      alert(`Agendamento criado com sucesso!\n\n` +
        `Barbeiro: ${result.data.barbeiro_atribuido}\n` +
        `${result.data.mensagem_rodizio || ''}\n` +
        `${result.data.webhook_enviado ? '✅ Notificação enviada!' : ''}`
      )

      setShowForm(false)
      setEditForm({
        nome_cliente: '',
        telefone: '',
        observacoes: '',
        status: 'agendado',
        data_agendamento: new Date().toISOString().split('T')[0],
        hora_inicio: '',
        profissional_id: '',
        servico_ids: [],
        cliente_id: ''
      })
      setHorariosDisponiveis([])
      setBarbeiroRodizio(null)
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      alert('Erro ao criar agendamento: ' + (error as any).message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado': return 'bg-red-500'
      case 'confirmado': return 'bg-green-500'
      case 'em_andamento': return 'bg-yellow-500'
      case 'concluido': return 'bg-red-500'
      case 'cancelado': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando agendamentos...</div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Agendamentos</h1>
          <p className="text-sm sm:text-base text-red-300">Gerencie todos os agendamentos da barbearia</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Botões de Visualização */}
          <div className="flex bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50">
            <button
              onClick={() => setVisualizacao('lista')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center space-x-1 sm:space-x-2 ${
                visualizacao === 'lista'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <span>📋</span>
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => {
                setVisualizacao('calendario')
                setFiltroTemporal('todos') // Carregar todos ao abrir calendário
              }}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center space-x-1 sm:space-x-2 ${
                visualizacao === 'calendario'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendário</span>
            </button>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-1 sm:space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Novo</span>
            <span className="xs:hidden">+</span>
          </button>
        </div>
      </div>

      {/* Filtros - Apenas em modo lista */}
      {visualizacao === 'lista' && (
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Filtro Temporal */}
              <div>
              <label className="block text-sm text-zinc-400 mb-2 font-medium">Período</label>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => setFiltroTemporal('hoje')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'hoje'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Hoje
                </button>

                <button
                  onClick={() => setFiltroTemporal('amanha')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'amanha'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Amanhã
                </button>

                <button
                  onClick={() => setFiltroTemporal('semana')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'semana'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Esta Semana
                </button>

                <button
                  onClick={() => setFiltroTemporal('proximos7')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'proximos7'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Próximos 7 dias
                </button>

                <button
                  onClick={() => setFiltroTemporal('passados')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'passados'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Passados (30 dias)
                </button>

                <button
                  onClick={() => setFiltroTemporal('todos')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroTemporal === 'todos'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Todos
                </button>

                <button
                  onClick={() => setFiltroTemporal('personalizado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    filtroTemporal === 'personalizado'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Personalizado
                </button>
              </div>

              {/* Data Personalizada */}
              {filtroTemporal === 'personalizado' && (
                <div className="mt-3">
                  <input
                    type="date"
                    value={dataPersonalizada}
                    onChange={(e) => setDataPersonalizada(e.target.value)}
                    className="bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                  />
                </div>
              )}
            </div>

            {/* Filtro de Status */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2 font-medium">Status</label>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => setFiltroStatus('todos')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'todos'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Todos
                </button>

                <button
                  onClick={() => setFiltroStatus('agendado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'agendado'
                      ? 'bg-red-600 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Agendado
                </button>

                <button
                  onClick={() => setFiltroStatus('confirmado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'confirmado'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Confirmado
                </button>

                <button
                  onClick={() => setFiltroStatus('em_andamento')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'em_andamento'
                      ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Em Andamento
                </button>

                <button
                  onClick={() => setFiltroStatus('concluido')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'concluido'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Concluído
                </button>

                <button
                  onClick={() => setFiltroStatus('cancelado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtroStatus === 'cancelado'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Cancelado
                </button>
              </div>
            </div>

              {/* Contador */}
              <div className="flex items-center space-x-2 text-sm text-zinc-400 pt-2 border-t border-zinc-700">
                <Calendar className="w-4 h-4" />
                <span>{agendamentos.length} agendamentos encontrados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visualização de Calendário */}
      {visualizacao === 'calendario' && (
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            {/* Header do Calendário */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 sm:mb-4 lg:mb-6">
              {/* Navegação de Data */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={() => {
                    if (calendarioView === 'mes') {
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
                    } else if (calendarioView === 'semana') {
                      const newWeek = new Date(currentWeekStart)
                      newWeek.setDate(currentWeekStart.getDate() - 7)
                      setCurrentWeekStart(newWeek)
                    } else {
                      const newDay = new Date(currentDay)
                      newDay.setDate(currentDay.getDate() - 1)
                      setCurrentDay(newDay)
                    }
                  }}
                  className="p-1.5 sm:p-2 hover:bg-zinc-700 rounded-lg transition-colors text-white text-lg sm:text-xl"
                >
                  ←
                </button>
                <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-white capitalize min-w-[200px] text-center">
                  {calendarioView === 'mes' && currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  {calendarioView === 'semana' && `${currentWeekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  {calendarioView === 'dia' && currentDay.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => {
                    if (calendarioView === 'mes') {
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
                    } else if (calendarioView === 'semana') {
                      const newWeek = new Date(currentWeekStart)
                      newWeek.setDate(currentWeekStart.getDate() + 7)
                      setCurrentWeekStart(newWeek)
                    } else {
                      const newDay = new Date(currentDay)
                      newDay.setDate(currentDay.getDate() + 1)
                      setCurrentDay(newDay)
                    }
                  }}
                  className="p-1.5 sm:p-2 hover:bg-zinc-700 rounded-lg transition-colors text-white text-lg sm:text-xl"
                >
                  →
                </button>
              </div>

              {/* Seletor de Visualização (Dia/Semana/Mês) */}
              <div className="flex bg-zinc-700/50 rounded-lg p-1 border border-zinc-600/50">
                <button
                  onClick={() => setCalendarioView('dia')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                    calendarioView === 'dia'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Dia
                </button>
                <button
                  onClick={() => {
                    setCalendarioView('semana')
                    // Ajustar para início da semana (domingo)
                    const today = new Date()
                    const startOfWeek = new Date(today)
                    startOfWeek.setDate(today.getDate() - today.getDay())
                    setCurrentWeekStart(startOfWeek)
                  }}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                    calendarioView === 'semana'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setCalendarioView('mes')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                    calendarioView === 'mes'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Mês
                </button>
              </div>

              {/* Botão Hoje */}
              <button
                onClick={() => {
                  const today = new Date()
                  setCurrentDay(today)
                  setCurrentMonth(today)
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - today.getDay())
                  setCurrentWeekStart(startOfWeek)
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                Hoje
              </button>
            </div>

            {/* Visualização Dia */}
            {calendarioView === 'dia' && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {/* Horários do dia (8:00 - 20:00) */}
                {Array.from({ length: 13 }, (_, i) => {
                  const hora = 8 + i
                  const horaStr = `${hora.toString().padStart(2, '0')}:00`
                  const dateStr = currentDay.toISOString().split('T')[0]
                  const agendsDaHora = agendamentos.filter(ag =>
                    ag.data_agendamento === dateStr && ag.hora_inicio.startsWith(horaStr.split(':')[0] + ':')
                  )

                  return (
                    <div key={hora} className="flex border-b border-zinc-700/50">
                      <div className="w-16 sm:w-20 flex-shrink-0 text-xs sm:text-sm text-zinc-400 font-medium py-2">
                        {horaStr}
                      </div>
                      <div className="flex-1 min-h-[60px] p-2 space-y-1">
                        {agendsDaHora.map(ag => (
                          <div
                            key={ag.id}
                            onClick={() => setDetalhesAgendamento(ag)}
                            className={`${getStatusColor(ag.status)} text-white p-2 rounded cursor-pointer hover:opacity-80 transition-opacity`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{ag.hora_inicio} - {ag.nome_cliente}</div>
                                <div className="text-xs opacity-90">✂️ {ag.profissionais?.nome}</div>
                              </div>
                              <div className="text-xs">
                                {ag.agendamento_servicos && ag.agendamento_servicos.length > 0
                                  ? ag.agendamento_servicos.reduce((sum, as) => sum + as.servicos.duracao_minutos, 0)
                                  : ag.servicos?.duracao_minutos || 30}min
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Visualização Semana */}
            {calendarioView === 'semana' && (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Cabeçalho da semana */}
                  <div className="grid grid-cols-8 gap-1 mb-2">
                    <div className="text-xs text-zinc-400">Hora</div>
                    {Array.from({ length: 7 }, (_, i) => {
                      const day = new Date(currentWeekStart)
                      day.setDate(currentWeekStart.getDate() + i)
                      const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                      return (
                        <div key={i} className={`text-center text-xs sm:text-sm font-medium ${isToday ? 'text-red-400' : 'text-zinc-400'}`}>
                          <div>{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i]}</div>
                          <div className={`text-lg ${isToday ? 'font-bold' : ''}`}>{day.getDate()}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Grid de horários */}
                  <div className="space-y-1 max-h-[500px] overflow-y-auto">
                    {Array.from({ length: 13 }, (_, hourIdx) => {
                      const hora = 8 + hourIdx
                      const horaStr = `${hora.toString().padStart(2, '0')}:00`

                      return (
                        <div key={hora} className="grid grid-cols-8 gap-1 border-b border-zinc-700/30">
                          <div className="text-xs text-zinc-400 py-1">{horaStr}</div>
                          {Array.from({ length: 7 }, (_, dayIdx) => {
                            const day = new Date(currentWeekStart)
                            day.setDate(currentWeekStart.getDate() + dayIdx)
                            const dateStr = day.toISOString().split('T')[0]
                            const agendsDaHora = agendamentos.filter(ag =>
                              ag.data_agendamento === dateStr && ag.hora_inicio.startsWith(horaStr.split(':')[0] + ':')
                            )

                            return (
                              <div key={dayIdx} className="min-h-[50px] p-1 bg-zinc-700/20 rounded">
                                {agendsDaHora.map(ag => (
                                  <div
                                    key={ag.id}
                                    onClick={() => setDetalhesAgendamento(ag)}
                                    className={`${getStatusColor(ag.status)} text-white text-[9px] sm:text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity mb-1`}
                                    title={`${ag.hora_inicio} - ${ag.nome_cliente}`}
                                  >
                                    <div className="truncate font-medium">{ag.nome_cliente}</div>
                                    <div className="truncate opacity-90">{ag.hora_inicio}</div>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Visualização Mês */}
            {calendarioView === 'mes' && (
              <div className="grid grid-cols-7 gap-1 sm:gap-2 overflow-x-auto">
                {/* Cabeçalho com dias da semana */}
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                  <div key={dia} className="text-center text-xs sm:text-sm font-medium text-zinc-400 py-1 sm:py-2">
                    <span className="hidden sm:inline">{dia}</span>
                    <span className="sm:hidden">{dia.charAt(0)}</span>
                  </div>
                ))}

                {/* Dias do mês */}
                {getDaysInMonth(currentMonth).map((day, idx) => {
                  const agendsDoDia = getAgendamentosPorData(day.dateStr)
                  const isToday = day.dateStr === new Date().toISOString().split('T')[0]

                  return (
                    <div
                      key={idx}
                      className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 rounded border transition-all ${
                        day.isCurrentMonth
                          ? 'bg-zinc-700/30 border-zinc-600/50'
                          : 'bg-zinc-800/20 border-zinc-700/30 opacity-50'
                      } ${
                        isToday ? 'ring-1 sm:ring-2 ring-red-500' : ''
                      }`}
                    >
                      <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                        day.isCurrentMonth ? 'text-white' : 'text-zinc-500'
                      } ${
                        isToday ? 'text-red-400 font-bold' : ''
                      }`}>
                        {day.date.getDate()}
                      </div>

                      {/* Agendamentos do dia */}
                      <div className="space-y-0.5 sm:space-y-1">
                        {agendsDoDia.slice(0, 2).map(ag => (
                          <div
                            key={ag.id}
                            onClick={() => setDetalhesAgendamento(ag)}
                            className={`text-[9px] sm:text-xs p-0.5 sm:p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(ag.status)} text-white truncate`}
                            title={`${ag.hora_inicio} - ${ag.nome_cliente}`}
                          >
                            <span className="hidden sm:inline">{ag.hora_inicio} {ag.nome_cliente}</span>
                            <span className="sm:hidden">{ag.hora_inicio}</span>
                          </div>
                        ))}
                        {agendsDoDia.length > 2 && (
                          <div className="text-[8px] sm:text-xs text-zinc-400 text-center">
                            +{agendsDoDia.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Agendamentos */}
      {visualizacao === 'lista' && (
        <div className="grid gap-3 sm:gap-4">
        {agendamentos.length === 0 ? (
          <Card className="bg-red-800/30 border-red-700/50">
            <CardContent className="p-6 sm:p-8 text-center">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-white mb-2">Nenhum agendamento</h3>
              <p className="text-sm sm:text-base text-red-300">Não há agendamentos para esta data.</p>
            </CardContent>
          </Card>
        ) : (
          agendamentos.map((agendamento) => (
            <Card
              key={agendamento.id}
              className="bg-red-800/30 border-red-700/50 hover:bg-red-800/40 transition-colors cursor-pointer"
              onClick={() => setDetalhesAgendamento(agendamento)}
            >
              <CardContent className="p-3 sm:p-4">
                {/* Layout Mobile */}
                <div className="lg:hidden space-y-4">
                  {/* Nome do Cliente - Destaque no topo */}
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <User className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span className="font-bold text-white text-base">{agendamento.nome_cliente}</span>
                        </div>
                        {agendamento.telefone && (
                          <div className="text-sm text-red-300 ml-6">({agendamento.telefone})</div>
                        )}
                      </div>
                    </div>

                    {/* Profissional */}
                    <div className="flex items-center space-x-2 ml-6 text-sm text-red-300">
                      <span>✂️</span>
                      <span>{agendamento.profissionais?.nome || 'Não definido'}</span>
                    </div>
                  </div>

                  {/* Data, Hora e Valor - Linha com destaque */}
                  <div className="flex items-center justify-between bg-red-900/20 rounded-lg p-3 border border-red-700/30">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-xs text-red-400 mb-1">{agendamento.data_agendamento}</div>
                        <div className="text-2xl font-bold text-white">{formatTime(agendamento.hora_inicio)}</div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(agendamento.status)} flex-shrink-0`}></div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-green-400 font-bold text-base">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(agendamento.valor)}</span>
                      </div>
                      <div className="text-xs text-red-300 capitalize mt-1">{agendamento.status.replace('_', ' ')}</div>
                    </div>
                  </div>

                  {/* Serviços - Lista clara */}
                  <div className="bg-zinc-800/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-red-400 font-medium">📋 Serviços:</div>
                      <div className="flex items-center space-x-1 text-red-300 text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {agendamento.agendamento_servicos && agendamento.agendamento_servicos.length > 0
                            ? agendamento.agendamento_servicos.reduce((sum, as) => sum + as.servicos.duracao_minutos, 0)
                            : agendamento.servicos?.duracao_minutos || 30}min
                        </span>
                      </div>
                    </div>
                    {agendamento.agendamento_servicos && agendamento.agendamento_servicos.length > 0 ? (
                      <div className="space-y-1.5">
                        {agendamento.agendamento_servicos.map((as, idx) => (
                          <div key={idx} className="text-sm text-white bg-red-700/20 px-3 py-1.5 rounded">
                            {as.servicos.nome}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-red-300">{agendamento.servicos?.nome || 'Não definido'}</div>
                    )}
                  </div>

                  {/* Observações */}
                  {agendamento.observacoes && (
                    <div className="text-sm text-red-300 bg-zinc-700/30 rounded-lg p-3">
                      <div className="font-medium text-red-400 mb-1">💬 Observações:</div>
                      {agendamento.observacoes}
                    </div>
                  )}

                  {/* Status de Comparecimento - Mobile */}
                  {agendamento.status !== 'cancelado' && agendamento.compareceu !== null && (
                    <div className={`text-sm font-medium px-3 py-2 rounded-lg text-center ${
                      agendamento.compareceu ? 'bg-green-700/30 text-green-400' : 'bg-red-700/30 text-red-400'
                    }`}>
                      {agendamento.compareceu ? '✓ Compareceu' : '✗ Não compareceu'}
                    </div>
                  )}

                  {/* Botões de Ação - Mobile */}
                  <div className="space-y-2 pt-3 border-t border-red-700/30" onClick={(e) => e.stopPropagation()}>
                    {/* Botões de Comparecimento */}
                    {agendamento.status !== 'cancelado' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => marcarComparecimento(agendamento.id, true)}
                          className={`flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                            agendamento.compareceu === true
                              ? 'bg-green-600 text-white shadow-lg'
                              : 'bg-green-700/30 text-green-300 hover:bg-green-700/50 border border-green-700/50'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Compareceu</span>
                        </button>
                        <button
                          onClick={() => marcarComparecimento(agendamento.id, false)}
                          className={`flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                            agendamento.compareceu === false
                              ? 'bg-red-600 text-white shadow-lg'
                              : 'bg-red-700/30 text-red-300 hover:bg-red-700/50 border border-red-700/50'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Faltou</span>
                        </button>
                      </div>
                    )}

                    {/* Botões de Editar e Cancelar */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEdit(agendamento)}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-zinc-700/50 hover:bg-zinc-700 text-white rounded-lg transition-colors text-xs font-medium border border-zinc-600/50"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDelete(agendamento.id)}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-red-700/30 hover:bg-red-700/50 text-red-300 hover:text-white rounded-lg transition-colors text-xs font-medium border border-red-700/50"
                        title="Cancelar"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Layout Desktop */}
                <div className="hidden lg:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-red-400 mb-1">{agendamento.data_agendamento}</div>
                      <div className="text-2xl font-bold text-white">{formatTime(agendamento.hora_inicio)}</div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="w-4 h-4 text-red-400" />
                        <span className="font-medium text-white">{agendamento.nome_cliente}</span>
                        <span className="text-red-300 text-sm">({agendamento.telefone})</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-red-300">
                          <span>✂️ {agendamento.profissionais?.nome || 'Profissional não definido'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-red-300">
                          <span>📋 Serviços:</span>
                          {agendamento.agendamento_servicos && agendamento.agendamento_servicos.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {agendamento.agendamento_servicos.map((as, idx) => (
                                <span key={idx} className="bg-red-700/30 px-2 py-0.5 rounded text-xs">
                                  {as.servicos.nome}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span>{agendamento.servicos?.nome || 'Não definido'}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-red-300">
                          <Clock className="w-3 h-3" />
                          <span>
                            {agendamento.agendamento_servicos && agendamento.agendamento_servicos.length > 0
                              ? agendamento.agendamento_servicos.reduce((sum, as) => sum + as.servicos.duracao_minutos, 0)
                              : agendamento.servicos?.duracao_minutos || 30}min
                          </span>
                        </div>
                      </div>

                      {agendamento.observacoes && (
                        <div className="mt-2 text-sm text-red-300">
                          💬 {agendamento.observacoes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-green-400 font-medium">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(agendamento.valor)}</span>
                      </div>
                      <div className="text-xs text-red-300 capitalize">{agendamento.status.replace('_', ' ')}</div>

                      {agendamento.status !== 'cancelado' && agendamento.compareceu === true && (
                        <div className="text-xs font-medium mt-1 text-green-400">
                          ✓ Compareceu
                        </div>
                      )}
                      {agendamento.status !== 'cancelado' && agendamento.compareceu === false && (
                        <div className="text-xs font-medium mt-1 text-red-400">
                          ✗ Não compareceu
                        </div>
                      )}
                    </div>

                    {agendamento.status !== 'cancelado' && (
                      <div className="flex flex-col space-y-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => marcarComparecimento(agendamento.id, true)}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded text-xs transition-colors ${
                            agendamento.compareceu === true
                              ? 'bg-green-600 text-white'
                              : 'text-green-300 hover:text-white hover:bg-green-700/50'
                          }`}
                          title="Marcar como presente"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Compareceu</span>
                        </button>
                        <button
                          onClick={() => marcarComparecimento(agendamento.id, false)}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded text-xs transition-colors ${
                            agendamento.compareceu === false
                              ? 'bg-red-600 text-white'
                              : 'text-red-300 hover:text-white hover:bg-red-700/50'
                          }`}
                          title="Marcar como faltou"
                        >
                        <XCircle className="w-4 h-4" />
                        <span>Faltou</span>
                      </button>
                    </div>
                    )}

                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(agendamento)}
                        className="p-2 text-red-300 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors"
                        title="Editar agendamento"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(agendamento.id)}
                        className="p-2 text-red-300 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors"
                        title="Excluir agendamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        </div>
      )}

      {/* Resumo do Dia - Apenas em modo lista */}
      {visualizacao === 'lista' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-red-800/30 border-red-700/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-bold text-white truncate">{agendamentos.length}</div>
                  <div className="text-xs sm:text-sm text-red-300">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-800/30 border-red-700/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-bold text-white truncate">
                    {formatCurrency(agendamentos.reduce((sum, a) => sum + a.valor, 0))}
                  </div>
                  <div className="text-xs sm:text-sm text-red-300">Receita</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-800/30 border-red-700/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-bold text-white truncate">
                    {agendamentos.reduce((sum, a) => sum + (a.servicos?.duracao_minutos || 30), 0)}min
                  </div>
                  <div className="text-xs sm:text-sm text-red-300">Tempo</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-800/30 border-red-700/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-bold text-white truncate">
                    {new Set(agendamentos.map(a => a.nome_cliente)).size}
                  </div>
                  <div className="text-xs sm:text-sm text-red-300">Clientes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Popup de Detalhes do Agendamento */}
      {detalhesAgendamento && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setDetalhesAgendamento(null)}>
          <div className="bg-zinc-800 rounded-lg p-4 sm:p-6 max-w-2xl w-full border border-red-500/50 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Detalhes do Agendamento</h2>
                <p className="text-xs sm:text-sm text-zinc-400">ID: {detalhesAgendamento.id.slice(0, 8)}...</p>
              </div>
              <button
                onClick={() => setDetalhesAgendamento(null)}
                className="text-zinc-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Status e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-zinc-700/30 rounded-lg p-4">
                  <div className="text-sm text-zinc-400 mb-1">Status</div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(detalhesAgendamento.status)}`}></div>
                    <span className="text-white font-medium capitalize">{detalhesAgendamento.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="bg-zinc-700/30 rounded-lg p-4">
                  <div className="text-sm text-zinc-400 mb-1">Data e Hora</div>
                  <div className="text-white font-medium">{detalhesAgendamento.data_agendamento} às {formatTime(detalhesAgendamento.hora_inicio)}</div>
                </div>
              </div>

              {/* Cliente */}
              <div className="bg-red-700/20 border border-red-600/30 rounded-lg p-4">
                <div className="text-sm text-red-300 mb-2 font-medium">Cliente</div>
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-5 h-5 text-red-400" />
                  <span className="text-white text-lg font-medium">{detalhesAgendamento.nome_cliente}</span>
                </div>
                {detalhesAgendamento.telefone && (
                  <div className="text-red-200">📞 {detalhesAgendamento.telefone}</div>
                )}
              </div>

              {/* Barbeiro e Serviços */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-zinc-700/30 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-zinc-400 mb-2">Barbeiro</div>
                  <div className="text-white font-medium text-sm sm:text-base">✂️ {detalhesAgendamento.profissionais?.nome || 'Não definido'}</div>
                </div>
                <div className="bg-zinc-700/30 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-zinc-400 mb-2">Duração</div>
                  <div className="text-white font-medium">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {detalhesAgendamento.agendamento_servicos && detalhesAgendamento.agendamento_servicos.length > 0
                      ? detalhesAgendamento.agendamento_servicos.reduce((sum, as) => sum + as.servicos.duracao_minutos, 0)
                      : detalhesAgendamento.servicos?.duracao_minutos || 30}min
                  </div>
                </div>
              </div>

              {/* Serviços */}
              <div className="bg-zinc-700/30 rounded-lg p-4">
                <div className="text-sm text-zinc-400 mb-3">Serviços</div>
                <div className="space-y-2">
                  {detalhesAgendamento.agendamento_servicos && detalhesAgendamento.agendamento_servicos.length > 0 ? (
                    detalhesAgendamento.agendamento_servicos.map((as, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-600/30 rounded px-3 py-2">
                        <span className="text-white">{as.servicos.nome}</span>
                        <span className="text-green-400 font-medium">{formatCurrency(as.servicos.preco)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center bg-zinc-600/30 rounded px-3 py-2">
                      <span className="text-white">{detalhesAgendamento.servicos?.nome || 'Não definido'}</span>
                      <span className="text-green-400 font-medium">{formatCurrency(detalhesAgendamento.servicos?.preco || 0)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-zinc-600 mt-3 pt-3 flex justify-between items-center">
                  <span className="text-white font-bold">Valor Total</span>
                  <span className="text-2xl font-bold text-green-400">{formatCurrency(detalhesAgendamento.valor)}</span>
                </div>
              </div>

              {/* Observações */}
              {detalhesAgendamento.observacoes && (
                <div className="bg-zinc-700/30 rounded-lg p-4">
                  <div className="text-sm text-zinc-400 mb-2">Observações</div>
                  <div className="text-white">{detalhesAgendamento.observacoes}</div>
                </div>
              )}

              {/* Comparecimento */}
              {/* Só mostrar "Cliente compareceu" se NÃO for cancelado */}
              {detalhesAgendamento.compareceu !== null && detalhesAgendamento.status !== 'cancelado' && (
                <div className={`rounded-lg p-4 ${
                  detalhesAgendamento.compareceu
                    ? 'bg-green-700/20 border border-green-600/30'
                    : 'bg-red-700/20 border border-red-600/30'
                }`}>
                  <div className="flex items-center space-x-2">
                    {detalhesAgendamento.compareceu ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-200 font-medium">Cliente compareceu</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-200 font-medium">Cliente não compareceu</span>
                      </>
                    )}
                  </div>
                  {detalhesAgendamento.checkin_at && (
                    <div className="text-xs text-zinc-400 mt-1">
                      Check-in: {new Date(detalhesAgendamento.checkin_at).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex space-x-3 pt-4 border-t border-zinc-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(detalhesAgendamento)
                    setDetalhesAgendamento(null)
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(detalhesAgendamento.id)
                    setDetalhesAgendamento(null)
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
                <button
                  onClick={() => setDetalhesAgendamento(null)}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingAgendamento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-zinc-800 rounded-lg p-4 sm:p-6 max-w-md w-full border border-zinc-700">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Editar Agendamento</h2>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm text-zinc-400 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={editForm.nome_cliente}
                  onChange={(e) => setEditForm({ ...editForm, nome_cliente: e.target.value })}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-zinc-400 mb-1">Telefone</label>
                <input
                  type="text"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-sm sm:text-base text-white"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-zinc-400 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-sm sm:text-base text-white [&>option]:bg-zinc-700 [&>option]:text-white"
                >
                  <option value="agendado" className="bg-zinc-700 text-white">Agendado</option>
                  <option value="confirmado" className="bg-zinc-700 text-white">Confirmado</option>
                  <option value="em_andamento" className="bg-zinc-700 text-white">Em Andamento</option>
                  <option value="concluido" className="bg-zinc-700 text-white">Concluído</option>
                  <option value="cancelado" className="bg-zinc-700 text-white">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-zinc-400 mb-1">Observações</label>
                <textarea
                  value={editForm.observacoes}
                  onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-sm sm:text-base text-white h-20 sm:h-24"
                />
              </div>

              <div className="flex space-x-2 sm:space-x-3 pt-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditingAgendamento(null)}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Agendamento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-zinc-800 rounded-lg p-4 sm:p-6 max-w-2xl w-full border border-zinc-700 my-4 sm:my-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Novo Agendamento</h2>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Buscar Cliente */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Buscar Cliente (opcional)</label>
                <input
                  type="text"
                  value={searchCliente}
                  onChange={(e) => {
                    setSearchCliente(e.target.value)
                    searchClientes(e.target.value)
                  }}
                  placeholder="Digite nome ou telefone..."
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                />
                {clientes.length > 0 && (
                  <div className="mt-2 bg-zinc-700 rounded border border-zinc-600 max-h-40 overflow-y-auto">
                    {clientes.map(cliente => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setEditForm({
                            ...editForm,
                            cliente_id: cliente.id,
                            nome_cliente: cliente.nome_completo,
                            telefone: cliente.telefone
                          })
                          setSearchCliente('')
                          setClientes([])
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-600 text-white text-sm"
                      >
                        {cliente.nome_completo} - {cliente.telefone}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dados do Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    value={editForm.nome_cliente}
                    onChange={(e) => setEditForm({ ...editForm, nome_cliente: e.target.value })}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Telefone (busca automática)</label>
                  <input
                    type="text"
                    value={editForm.telefone}
                    onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                    onBlur={(e) => buscarClientePorTelefone(e.target.value)}
                    placeholder="Digite o telefone..."
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Digite o telefone e clique fora para buscar o cliente</p>
                </div>
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Data *</label>
                  <input
                    type="date"
                    value={editForm.data_agendamento}
                    onChange={(e) => setEditForm({ ...editForm, data_agendamento: e.target.value })}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Hora *
                    {checkingAvailability && <span className="ml-2 text-xs text-red-400">Verificando...</span>}
                  </label>
                  {horariosDisponiveis.length > 0 ? (
                    <select
                      value={editForm.hora_inicio}
                      onChange={(e) => setEditForm({ ...editForm, hora_inicio: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white [&>option]:bg-zinc-700 [&>option]:text-white"
                      required
                    >
                      <option value="" className="bg-zinc-700 text-white">Selecione um horário disponível...</option>
                      {horariosDisponiveis.map(hora => (
                        <option key={hora} value={hora} className="bg-zinc-700 text-white">{hora}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="time"
                      value={editForm.hora_inicio}
                      onChange={(e) => setEditForm({ ...editForm, hora_inicio: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                      required
                    />
                  )}
                  {horariosDisponiveis.length === 0 && editForm.data_agendamento && editForm.servico_ids.length > 0 && !checkingAvailability && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠ Nenhum horário disponível. Selecione outra data ou barbeiro.
                    </p>
                  )}
                </div>
              </div>

              {/* Profissional */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Profissional (opcional - deixe vazio para rodízio automático)
                </label>
                <select
                  value={editForm.profissional_id}
                  onChange={(e) => setEditForm({ ...editForm, profissional_id: e.target.value })}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white [&>option]:bg-zinc-700 [&>option]:text-white"
                >
                  <option value="" className="bg-zinc-700 text-white">🔄 Rodízio Automático (barbeiro com menos atendimentos)</option>
                  {profissionais.map(prof => (
                    <option key={prof.id} value={prof.id} className="bg-zinc-700 text-white">{prof.nome}</option>
                  ))}
                </select>

                {/* Informação do Rodízio */}
                {!editForm.profissional_id && barbeiroRodizio && (
                  <div className="mt-2 bg-red-700/30 border border-red-600/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white font-medium">Barbeiro do Rodízio:</span>
                      <span className="text-red-200">{barbeiroRodizio.nome}</span>
                    </div>
                    <div className="text-xs text-red-300 mt-1">
                      {barbeiroRodizio.atendimentos} atendimento(s) hoje
                    </div>
                  </div>
                )}

                {!editForm.profissional_id && !barbeiroRodizio && editForm.hora_inicio && (
                  <div className="mt-2 text-xs text-zinc-400">
                    ℹ️ Selecione data, hora e serviços para ver qual barbeiro será atribuído
                  </div>
                )}
              </div>

              {/* Serviços (seleção múltipla) */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Serviços * (pode selecionar múltiplos)</label>
                <div className="space-y-2 bg-zinc-700/30 p-3 rounded-lg max-h-64 overflow-y-auto">
                  {servicos.map(servico => (
                    <label
                      key={servico.id}
                      className="flex items-center space-x-3 p-2 bg-zinc-700/50 rounded hover:bg-zinc-600/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={editForm.servico_ids.includes(servico.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditForm({
                              ...editForm,
                              servico_ids: [...editForm.servico_ids, servico.id]
                            })
                          } else {
                            setEditForm({
                              ...editForm,
                              servico_ids: editForm.servico_ids.filter(id => id !== servico.id)
                            })
                          }
                        }}
                        className="w-4 h-4 text-red-600 bg-zinc-600 border-zinc-500 rounded focus:ring-red-500"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">{servico.nome}</div>
                        <div className="text-sm text-zinc-400">
                          R$ {servico.preco.toFixed(2)} • {servico.duracao_minutos}min
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Observações</label>
                <textarea
                  value={editForm.observacoes}
                  onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white h-24"
                />
              </div>

              {/* Resumo dos serviços selecionados */}
              {editForm.servico_ids.length > 0 && (
                <div className="bg-red-700/30 p-4 rounded-lg space-y-2">
                  <div className="text-red-300 text-sm mb-2">Serviços Selecionados</div>
                  {servicos.filter(s => editForm.servico_ids.includes(s.id)).map(servico => (
                    <div key={servico.id} className="flex justify-between text-sm text-white">
                      <span>{servico.nome}</span>
                      <span className="text-green-400">{formatCurrency(servico.preco)}</span>
                    </div>
                  ))}
                  <div className="border-t border-red-600 pt-2 mt-2 flex justify-between">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-2xl font-bold text-green-400">
                      {formatCurrency(
                        servicos
                          .filter(s => editForm.servico_ids.includes(s.id))
                          .reduce((sum, s) => sum + s.preco, 0)
                      )}
                    </span>
                  </div>
                  <div className="text-sm text-red-300">
                    Duração total: {servicos
                      .filter(s => editForm.servico_ids.includes(s.id))
                      .reduce((sum, s) => sum + s.duracao_minutos, 0)} minutos
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6 border-t border-zinc-700 pt-4">
              <button
                onClick={handleAddAgendamento}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Criar Agendamento
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditForm({
                    nome_cliente: '',
                    telefone: '',
                    observacoes: '',
                    status: 'agendado',
                    data_agendamento: new Date().toISOString().split('T')[0],
                    hora_inicio: '',
                    profissional_id: '',
                    servico_ids: [],
                    cliente_id: ''
                  })
                  setHorariosDisponiveis([])
                  setBarbeiroRodizio(null)
                }}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
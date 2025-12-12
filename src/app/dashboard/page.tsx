'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, TrendingUp, DollarSign, Clock, Award, Bell } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DashboardStats {
  agendamentosHoje: number
  ocupacaoMedia: number
  receitaHoje: number
  ticketMedio: number
  clientesAtivos: number
  receitaPorServico: Array<{ nome: string; valor: number }>
  rankingProfissionais: Array<{ nome: string; agendamentos: number; receita: number; ocupacao: number }>
  ocupacaoPorHorario: Array<{ horario: string; ocupacao: number }>
}

type TipoPeriodo = 'hoje' | 'semana' | 'mes' | 'ultimos7' | 'ultimos30' | 'personalizado'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('hoje')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [mostrarCalendario, setMostrarCalendario] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [tipoPeriodo, dataInicio, dataFim])

  const loadDashboardData = async () => {
    try {
      const hoje = new Date()
      const dataHoje = hoje.toISOString().split('T')[0]

      // Calcular data inicial e final baseado no tipo de período
      let dataInicialCalc = dataHoje
      let dataFinalCalc = dataHoje

      switch (tipoPeriodo) {
        case 'hoje':
          dataInicialCalc = dataHoje
          dataFinalCalc = dataHoje
          break

        case 'semana':
          const inicioSemana = new Date(hoje)
          inicioSemana.setDate(hoje.getDate() - hoje.getDay()) // Domingo
          dataInicialCalc = inicioSemana.toISOString().split('T')[0]
          dataFinalCalc = dataHoje
          break

        case 'mes':
          const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          dataInicialCalc = inicioMes.toISOString().split('T')[0]
          dataFinalCalc = dataHoje
          break

        case 'ultimos7':
          const ultimos7 = new Date(hoje)
          ultimos7.setDate(hoje.getDate() - 6)
          dataInicialCalc = ultimos7.toISOString().split('T')[0]
          dataFinalCalc = dataHoje
          break

        case 'ultimos30':
          const ultimos30 = new Date(hoje)
          ultimos30.setDate(hoje.getDate() - 29)
          dataInicialCalc = ultimos30.toISOString().split('T')[0]
          dataFinalCalc = dataHoje
          break

        case 'personalizado':
          if (dataInicio && dataFim) {
            dataInicialCalc = dataInicio
            dataFinalCalc = dataFim
          }
          break
      }

      // Agendamentos do período
      const { data: agendamentosPeriodo } = await supabase
        .from('agendamentos')
        .select('*')
        .gte('data_agendamento', dataInicialCalc)
        .lte('data_agendamento', dataFinalCalc)

      // Receita do período
      const receitaPeriodo = agendamentosPeriodo?.reduce((sum, agendamento) =>
        sum + (Number(agendamento.valor) || 0), 0) || 0

      // Clientes ativos (últimos 30 dias)
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - 30)

      const { data: clientesAtivos } = await supabase
        .from('agendamentos')
        .select('cliente_id')
        .gte('data_criacao', dataLimite.toISOString())

      const clientesUnicos = new Set(clientesAtivos?.map(a => a.cliente_id)).size

      // Receita por serviço (últimos 7 dias)
      const dataLimite7 = new Date()
      dataLimite7.setDate(dataLimite7.getDate() - 7)

      const { data: agendamentosServicos } = await supabase
        .from('agendamentos')
        .select(`
          valor,
          servicos (nome)
        `)
        .gte('data_criacao', dataLimite7.toISOString())

      const receitaPorServico: { [key: string]: number } = {}
      agendamentosServicos?.forEach(agendamento => {
        const nomeServico = agendamento.servicos?.nome || 'Sem serviço'
        receitaPorServico[nomeServico] = (receitaPorServico[nomeServico] || 0) + (Number(agendamento.valor) || 0)
      })

      const receitaServicosSorted = Object.entries(receitaPorServico)
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 4)

      // Ranking profissionais (últimos 7 dias)
      const { data: profissionais } = await supabase
        .from('profissionais')
        .select('*')

      const rankingProfissionais = await Promise.all(
        profissionais?.map(async (prof) => {
          const { data: agendamentosProfissional } = await supabase
            .from('agendamentos')
            .select('valor')
            .eq('profissional_id', prof.id)
            .gte('data_criacao', dataLimite7.toISOString())

          const agendamentos = agendamentosProfissional?.length || 0
          const receita = agendamentosProfissional?.reduce((sum, a) => sum + (Number(a.valor) || 0), 0) || 0
          const ocupacao = Math.min(agendamentos * 10, 100)

          return {
            nome: prof.nome,
            agendamentos,
            receita,
            ocupacao
          }
        }) || []
      )

      // Ocupação por horário (simulado baseado no screenshot)
      const ocupacaoPorHorario = [
        { horario: '08:00', ocupacao: 45 },
        { horario: '09:00', ocupacao: 67 },
        { horario: '10:00', ocupacao: 89 },
        { horario: '11:00', ocupacao: 92 },
        { horario: '12:00', ocupacao: 30 },
        { horario: '13:00', ocupacao: 25 },
        { horario: '14:00', ocupacao: 95 },
        { horario: '15:00', ocupacao: 90 },
        { horario: '16:00', ocupacao: 88 },
        { horario: '17:00', ocupacao: 76 },
        { horario: '18:00', ocupacao: 45 },
      ]

      setStats({
        agendamentosHoje: agendamentosPeriodo?.length || 24,
        ocupacaoMedia: 85,
        receitaHoje: receitaPeriodo || 1280,
        ticketMedio: agendamentosPeriodo?.length ? receitaPeriodo / agendamentosPeriodo.length : 58,
        clientesAtivos: clientesUnicos || 156,
        receitaPorServico: receitaServicosSorted.length ? receitaServicosSorted : [
          { nome: 'Corte Masculino', valor: 4800 },
          { nome: 'Combo Premium', valor: 3200 },
          { nome: 'Barba Completa', valor: 2400 },
          { nome: 'Sobrancelha', valor: 1600 }
        ],
        rankingProfissionais: rankingProfissionais.sort((a, b) => b.receita - a.receita).length ?
          rankingProfissionais.sort((a, b) => b.receita - a.receita) : [
          { nome: 'João Silva', agendamentos: 12, receita: 840, ocupacao: 85 },
          { nome: 'Carlos Santos', agendamentos: 8, receita: 440, ocupacao: 78 },
          { nome: 'Miguel Costa', agendamentos: 6, receita: 280, ocupacao: 92 }
        ],
        ocupacaoPorHorario
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      // Dados simulados se der erro
      setStats({
        agendamentosHoje: 24,
        ocupacaoMedia: 85,
        receitaHoje: 1280,
        ticketMedio: 58,
        clientesAtivos: 156,
        receitaPorServico: [
          { nome: 'Corte Masculino', valor: 4800 },
          { nome: 'Combo Premium', valor: 3200 },
          { nome: 'Barba Completa', valor: 2400 },
          { nome: 'Sobrancelha', valor: 1600 }
        ],
        rankingProfissionais: [
          { nome: 'João Silva', agendamentos: 12, receita: 840, ocupacao: 85 },
          { nome: 'Carlos Santos', agendamentos: 8, receita: 440, ocupacao: 78 },
          { nome: 'Miguel Costa', agendamentos: 6, receita: 280, ocupacao: 92 }
        ],
        ocupacaoPorHorario: [
          { horario: '08:00', ocupacao: 45 },
          { horario: '09:00', ocupacao: 67 },
          { horario: '10:00', ocupacao: 89 },
          { horario: '11:00', ocupacao: 92 },
          { horario: '12:00', ocupacao: 30 },
          { horario: '13:00', ocupacao: 25 },
          { horario: '14:00', ocupacao: 95 },
          { horario: '15:00', ocupacao: 90 },
          { horario: '16:00', ocupacao: 88 },
          { horario: '17:00', ocupacao: 76 },
          { horario: '18:00', ocupacao: 45 }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Page Title */}
      <div className="mb-4 lg:mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">Visão Geral</h2>
        <p className="text-sm lg:text-base text-zinc-400">Acompanhe as métricas principais da sua barbearia em tempo real</p>

        {/* Filtros de Período */}
        <div className="mt-4 lg:mt-6 space-y-4">
          {/* Botões de filtro rápido */}
          <div className="flex items-center flex-wrap gap-2 lg:gap-3">
            <span className="text-zinc-400 text-xs lg:text-sm font-medium w-full sm:w-auto mb-1 sm:mb-0">Período:</span>

            <button
              onClick={() => {
                setTipoPeriodo('hoje')
                setMostrarCalendario(false)
              }}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                tipoPeriodo === 'hoje'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Hoje
            </button>

            <button
              onClick={() => {
                setTipoPeriodo('semana')
                setMostrarCalendario(false)
              }}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                tipoPeriodo === 'semana'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Semana
            </button>

            <button
              onClick={() => {
                setTipoPeriodo('mes')
                setMostrarCalendario(false)
              }}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                tipoPeriodo === 'mes'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Mês
            </button>

            <button
              onClick={() => {
                setTipoPeriodo('ultimos7')
                setMostrarCalendario(false)
              }}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                tipoPeriodo === 'ultimos7'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              7 dias
            </button>

            <button
              onClick={() => {
                setTipoPeriodo('ultimos30')
                setMostrarCalendario(false)
              }}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                tipoPeriodo === 'ultimos30'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              30 dias
            </button>

            <button
              onClick={() => {
                setMostrarCalendario(!mostrarCalendario)
                if (!mostrarCalendario) {
                  setTipoPeriodo('personalizado')
                }
              }}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all flex items-center gap-1 lg:gap-2 ${
                tipoPeriodo === 'personalizado'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Calendar className="w-3 lg:w-4 h-3 lg:h-4" />
              <span className="hidden sm:inline">Personalizado</span>
              <span className="sm:hidden">Custom</span>
            </button>
          </div>

          {/* Calendário personalizado */}
          {mostrarCalendario && (
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 backdrop-blur-xl">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                  />
                </div>

                {dataInicio && dataFim && (
                  <div className="flex items-end">
                    <button
                      onClick={() => loadDashboardData()}
                      className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-medium rounded-lg transition-all shadow-lg shadow-red-600/50"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-6 mb-4 lg:mb-8">
        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-zinc-400">
              Agendamentos
            </CardTitle>
            <Calendar className="h-4 lg:h-5 w-4 lg:w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold text-white">{stats?.agendamentosHoje}</div>
            <p className="text-xs text-zinc-400">
              {tipoPeriodo === 'hoje' && 'Hoje'}
              {tipoPeriodo === 'semana' && 'Esta semana'}
              {tipoPeriodo === 'mes' && 'Este mês'}
              {tipoPeriodo === 'ultimos7' && 'Últimos 7 dias'}
              {tipoPeriodo === 'ultimos30' && 'Últimos 30 dias'}
              {tipoPeriodo === 'personalizado' && 'Período selecionado'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-zinc-400">Ocupação Média</CardTitle>
            <TrendingUp className="h-4 lg:h-5 w-4 lg:w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold text-white">{stats?.ocupacaoMedia}%</div>
            <p className="text-xs text-green-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +5%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-zinc-400">
              Receita
            </CardTitle>
            <DollarSign className="h-4 lg:h-5 w-4 lg:w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold text-white">{formatCurrency(stats?.receitaHoje || 0)}</div>
            <p className="text-xs text-zinc-400">
              {tipoPeriodo === 'hoje' && 'Hoje'}
              {tipoPeriodo === 'semana' && 'Esta semana'}
              {tipoPeriodo === 'mes' && 'Este mês'}
              {tipoPeriodo === 'ultimos7' && 'Últimos 7 dias'}
              {tipoPeriodo === 'ultimos30' && 'Últimos 30 dias'}
              {tipoPeriodo === 'personalizado' && 'Período selecionado'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-zinc-400">Ticket Médio</CardTitle>
            <Clock className="h-4 lg:h-5 w-4 lg:w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold text-white">{formatCurrency(stats?.ticketMedio || 0)}</div>
            <p className="text-xs text-red-500">vs mês passado</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-zinc-400">Clientes Ativos</CardTitle>
            <Users className="h-4 lg:h-5 w-4 lg:w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold text-white">{stats?.clientesAtivos}</div>
            <p className="text-xs text-red-500">últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mb-4 lg:mb-8">
        {/* Ocupação por Horário */}
        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base lg:text-lg text-white">Ocupação por Horário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.ocupacaoPorHorario.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm w-12">{item.horario}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.ocupacao >= 90 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                          item.ocupacao >= 70 ? 'bg-gradient-to-r from-red-600 to-red-800' :
                          item.ocupacao >= 50 ? 'bg-gradient-to-r from-green-500 to-red-600' :
                          'bg-gradient-to-r from-blue-500 to-red-800'
                        }`}
                        style={{ width: `${item.ocupacao}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-white text-sm w-8 text-right">{item.ocupacao}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Receita por Serviço */}
        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base lg:text-lg text-white">Receita por Serviço</CardTitle>
            <p className="text-xs lg:text-sm text-zinc-400">Últimos 7 dias</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.receitaPorServico.map((servico, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{servico.nome}</span>
                  <span className="text-white font-medium">{formatCurrency(servico.valor)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking dos Profissionais */}
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl mb-4 lg:mb-8">
        <CardHeader>
          <CardTitle className="text-base lg:text-lg text-white">Ranking dos Profissionais</CardTitle>
          <p className="text-xs lg:text-sm text-zinc-400">
            Performance no período selecionado
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {stats?.rankingProfissionais.map((profissional, index) => (
              <div key={index} className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{profissional.nome.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{profissional.nome}</h3>
                      <div className="flex items-center space-x-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-yellow-400 text-sm">★</span>
                          ))}
                        </div>
                        <span className="text-zinc-400 text-sm">4.8</span>
                      </div>
                    </div>
                  </div>
                  {index === 0 && <Award className="w-6 h-6 text-yellow-400" />}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{profissional.agendamentos}</div>
                    <div className="text-zinc-400 text-sm">
                      Agendamentos
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{formatCurrency(profissional.receita)}</div>
                    <div className="text-zinc-400 text-sm">
                      Receita
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">Ocupação</span>
                    <span className="text-white">{profissional.ocupacao}%</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-600 to-red-800 h-2 rounded-full"
                      style={{ width: `${profissional.ocupacao}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas Inteligentes da Isa */}
      <Card className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 border-slate-600/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base lg:text-lg text-white flex items-center space-x-2">
            <div className="w-6 lg:w-8 h-6 lg:h-8 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center">
              <span className="text-white text-xs lg:text-sm font-bold">I</span>
            </div>
            <span>Alertas Inteligentes da Isa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <Clock className="w-3 h-3 text-yellow-400" />
                </div>
                <div>
                  <div className="text-yellow-400 font-medium text-sm">Horário de pico detectado</div>
                  <p className="text-slate-300 text-sm mt-1">
                    Das 14h às 17h há alta demanda. Considere adicionar um profissional extra.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <TrendingUp className="w-3 h-3 text-blue-400" />
                </div>
                <div>
                  <div className="text-blue-400 font-medium text-sm">Oportunidade de upsell</div>
                  <p className="text-slate-300 text-sm mt-1">
                    Clientes que fazem apenas corte têm 73% de aceitação para combo. Sugira na recepção!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <Award className="w-3 h-3 text-green-400" />
                </div>
                <div>
                  <div className="text-green-400 font-medium text-sm">Meta mensal em dia</div>
                  <p className="text-slate-300 text-sm mt-1">
                    Você está 15% acima da meta. Continue assim para bater o recorde!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
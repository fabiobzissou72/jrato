'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Search, Phone, Mail, Calendar, Star, Edit, Trash2, Plus, ChevronLeft, ChevronRight, Send, X } from 'lucide-react'

interface Cliente {
  id: string
  telefone: string
  nome_completo: string
  email: string
  data_nascimento: string
  profissao: string
  estado_civil: string
  tem_filhos: string
  nomes_filhos: string[]
  idades_filhos: string[]
  estilo_cabelo: string
  preferencias_corte: string
  tipo_bebida: string
  alergias: string
  frequencia_retorno: string
  profissional_preferido: string
  observacoes: string
  is_vip: boolean
  created_at: string
  como_soube: string
  gosta_conversar: string
  menory_long: string
  tratamento: string
  ultimo_servico: string
  plano_id: string | null
}

interface Profissional {
  id: string
  nome_completo: string
}

interface Plano {
  id: string
  nome_completo: string
  valor_total: number
  valor_original: number
  ativo: boolean
}

function ClientesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [totalClientes, setTotalClientes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBarbeiro, setSelectedBarbeiro] = useState('')
  const [filtroVIP, setFiltroVIP] = useState(searchParams.get('filter') === 'vip')
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [clientesVisitas, setClientesVisitas] = useState<Record<string, number>>({})
  const [clienteParaMensagem, setClienteParaMensagem] = useState<Cliente | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [editForm, setEditForm] = useState({
    nome_completo: '',
    telefone: '',
    email: '',
    data_nascimento: '',
    profissao: '',
    estado_civil: '',
    tem_filhos: '',
    nomes_filhos: [] as string[],
    idades_filhos: [] as string[],
    estilo_cabelo: '',
    preferencias_corte: '',
    tipo_bebida: '',
    alergias: '',
    frequencia_retorno: '',
    profissional_preferido: '',
    observacoes: '',
    is_vip: false,
    como_soube: '',
    gosta_conversar: '',
    menory_long: '',
    tratamento: '',
    ultimo_servico: '',
    plano_id: '' as string | null
  })
  const itemsPerPage = 20

  useEffect(() => {
    loadProfissionais()
    loadPlanos()
    loadClientesVisitas()
    loadClientes('', '', 1)
    loadWebhookUrl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Atualizar filtro VIP quando o parâmetro da URL mudar
    const isVIPFilter = searchParams.get('filter') === 'vip'
    setFiltroVIP(isVIPFilter)
    setCurrentPage(1)
    loadClientes(searchTerm, selectedBarbeiro, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    loadClientes(searchTerm, selectedBarbeiro, currentPage)
  }, [currentPage])

  const loadProfissionais = async () => {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setProfissionais(data || [])
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error)
    }
  }

  const loadPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from('planos')
        .select('id, nome, valor_total, valor_original, ativo')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      console.log('Planos carregados:', data)
      setPlanos(data || [])
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
    }
  }

  const loadClientesVisitas = async () => {
    try {
      // Carregar todos os agendamentos onde cliente compareceu
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('cliente_id, compareceu')

      if (error) throw error

      console.log('=== DEBUG VISITAS ===')
      console.log('Total de agendamentos:', agendamentos?.length)
      console.log('Primeiros 5 agendamentos:', agendamentos?.slice(0, 5))

      // Contar visitas por cliente (apenas onde compareceu ou não foi marcado)
      const visitasPorCliente: Record<string, number> = {}
      agendamentos?.forEach(ag => {
        if (ag.cliente_id && ag.compareceu !== false) {
          visitasPorCliente[ag.cliente_id] = (visitasPorCliente[ag.cliente_id] || 0) + 1
        }
      })

      setClientesVisitas(visitasPorCliente)
      console.log('Visitas por cliente carregadas:', visitasPorCliente)
      console.log('Clientes com 5+ visitas:', Object.entries(visitasPorCliente).filter(([_, count]) => count >= 5))
    } catch (error) {
      console.error('Erro ao carregar visitas dos clientes:', error)
    }
  }

  const loadWebhookUrl = async () => {
    try {
      const { data } = await supabase
        .from('configuracoes')
        .select('webhook_url')
        .single()

      if (data && data.webhook_url) {
        setWebhookUrl(data.webhook_url)
      }
    } catch (error) {
      console.log('Erro ao carregar webhook URL:', error)
    }
  }

  const handleEnviarMensagem = async () => {
    if (!clienteParaMensagem || !mensagem) {
      alert('Por favor, digite a mensagem')
      return
    }

    if (!webhookUrl) {
      alert('Webhook não configurado. Configure em Configurações primeiro.')
      return
    }

    try {
      setEnviandoMensagem(true)

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefone: clienteParaMensagem.telefone,
          mensagem: mensagem,
          nome_cliente: clienteParaMensagem.nome
        })
      })

      if (response.ok) {
        alert('Mensagem enviada com sucesso!')
        setClienteParaMensagem(null)
        setMensagem('')
      } else {
        throw new Error('Erro ao enviar mensagem')
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      alert('Erro ao enviar mensagem. Verifique a URL do webhook.')
    } finally {
      setEnviandoMensagem(false)
    }
  }

  const loadClientes = async (search: string = '', barbeiro: string = '', page: number = 1) => {
    try {
      setLoading(true)

      // Limpar o termo de busca se parecer um telefone (só números)
      const searchClean = search.replace(/\D/g, '') // Remove tudo que não é dígito
      const isPhoneSearch = searchClean.length >= 9 && /^\d+$/.test(search.replace(/\s/g, ''))

      // Para filtro VIP, precisamos carregar TODOS os clientes primeiro para filtrar por visitas
      if (filtroVIP) {
        let query = supabase
          .from('clientes')
          .select('*')
          .order('created_at', { ascending: false })

        if (search) {
          // Se parecer busca por telefone, buscar apenas nos dígitos
          if (isPhoneSearch) {
            query = query.or(`nome_completo.ilike.%${search}%,telefone.ilike.%${searchClean}%,email.ilike.%${search}%`)
          } else {
            query = query.or(`nome_completo.ilike.%${search}%,telefone.ilike.%${search}%,email.ilike.%${search}%`)
          }
        }

        if (barbeiro) {
          query = query.ilike('profissional_preferido', `%${barbeiro}%`)
        }

        const { data: todosClientes, error } = await query

        if (error) throw error

        console.log('=== DEBUG FILTRO VIP ===')
        console.log('Total de clientes no banco:', todosClientes?.length)
        console.log('ClientesVisitas state:', clientesVisitas)

        // Filtrar clientes VIP (is_vip = true OU 5+ visitas)
        const clientesVIP = (todosClientes || []).filter(cliente => {
          const visitas = clientesVisitas[cliente.id] || 0
          const isVIPManual = cliente.is_vip === true
          const isVIPPorVisitas = visitas >= 5
          const isVIP = isVIPManual || isVIPPorVisitas

          console.log(`Cliente ${cliente.nome_completo}: ${visitas} visitas, is_vip=${isVIPManual}, VIP=${isVIP}`)
          return isVIP
        })

        console.log(`Clientes VIP encontrados (manual OU 5+ visitas): ${clientesVIP.length}`)

        // Aplicar paginação manualmente
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage
        const clientesPaginados = clientesVIP.slice(from, to)

        setTotalClientes(clientesVIP.length)
        setClientes(clientesPaginados)
        console.log(`Clientes VIP carregados: ${clientesPaginados.length} de ${clientesVIP.length} (página ${page})`)
      } else {
        // Modo normal (sem filtro VIP)
        let countQuery = supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })

        if (search) {
          // Se parecer busca por telefone, buscar apenas nos dígitos
          if (isPhoneSearch) {
            countQuery = countQuery.or(`nome_completo.ilike.%${search}%,telefone.ilike.%${searchClean}%,email.ilike.%${search}%`)
          } else {
            countQuery = countQuery.or(`nome_completo.ilike.%${search}%,telefone.ilike.%${search}%,email.ilike.%${search}%`)
          }
        }

        if (barbeiro) {
          countQuery = countQuery.ilike('profissional_preferido', `%${barbeiro}%`)
        }

        const { count } = await countQuery
        setTotalClientes(count || 0)

        // Buscar clientes com paginação
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage - 1

        let query = supabase
          .from('clientes')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to)

        if (search) {
          // Se parecer busca por telefone, buscar apenas nos dígitos
          if (isPhoneSearch) {
            query = query.or(`nome_completo.ilike.%${search}%,telefone.ilike.%${searchClean}%,email.ilike.%${search}%`)
          } else {
            query = query.or(`nome_completo.ilike.%${search}%,telefone.ilike.%${search}%,email.ilike.%${search}%`)
          }
        }

        if (barbeiro) {
          query = query.ilike('profissional_preferido', `%${barbeiro}%`)
        }

        const { data, error } = await query

        if (error) throw error
        console.log(`Clientes carregados: ${data?.length} de ${count} (página ${page})`)
        setClientes(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    loadClientes(searchTerm, selectedBarbeiro, 1)
  }

  const totalPages = Math.ceil(totalClientes / itemsPerPage)

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('Cliente excluído com sucesso!')
      loadClientes(searchTerm, selectedBarbeiro, currentPage)
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      alert('Erro ao excluir cliente')
    }
  }

  const handleEdit = (cliente: Cliente) => {
    console.log('Editando cliente:', cliente)
    console.log('Plano ID do cliente:', cliente.plano_id)
    setEditingCliente(cliente)
    setEditForm({
      nome_completo: cliente.nome_completo || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      data_nascimento: cliente.data_nascimento || '',
      profissao: cliente.profissao || '',
      estado_civil: cliente.estado_civil || '',
      tem_filhos: cliente.tem_filhos || '',
      nomes_filhos: cliente.nomes_filhos || [],
      idades_filhos: cliente.idades_filhos || [],
      estilo_cabelo: cliente.estilo_cabelo || '',
      preferencias_corte: cliente.preferencias_corte || '',
      tipo_bebida: cliente.tipo_bebida || '',
      alergias: cliente.alergias || '',
      frequencia_retorno: cliente.frequencia_retorno || '',
      profissional_preferido: cliente.profissional_preferido || '',
      observacoes: cliente.observacoes || '',
      is_vip: cliente.is_vip || false,
      como_soube: cliente.como_soube || '',
      gosta_conversar: cliente.gosta_conversar || '',
      menory_long: cliente.menory_long || '',
      tratamento: cliente.tratamento || '',
      ultimo_servico: cliente.ultimo_servico || '',
      plano_id: cliente.plano_id || null
    })
  }

  const handleSaveEdit = async () => {
    if (!editingCliente) return

    try {
      console.log('Salvando editForm:', editForm)
      console.log('Plano ID sendo salvo:', editForm.plano_id)

      const { error } = await supabase
        .from('clientes')
        .update(editForm)
        .eq('id', editingCliente.id)

      if (error) throw error

      alert('Cliente atualizado com sucesso!')
      setEditingCliente(null)
      loadClientes(searchTerm, selectedBarbeiro, currentPage)
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      alert('Erro ao atualizar cliente')
    }
  }

  const handleAddCliente = async () => {
    try {
      const { error } = await supabase
        .from('clientes')
        .insert([editForm])

      if (error) throw error

      alert('Cliente adicionado com sucesso!')
      setShowAddForm(false)
      setEditForm({
        nome_completo: '',
        telefone: '',
        email: '',
        data_nascimento: '',
        profissao: '',
        estado_civil: '',
        tem_filhos: '',
        nomes_filhos: [] as string[],
        idades_filhos: [] as string[],
        estilo_cabelo: '',
        preferencias_corte: '',
        tipo_bebida: '',
        alergias: '',
        frequencia_retorno: '',
        profissional_preferido: '',
        observacoes: '',
        is_vip: false,
        como_soube: '',
        gosta_conversar: '',
        menory_long: '',
        tratamento: '',
        ultimo_servico: '',
        plano_id: null
      })
      loadClientes(searchTerm, selectedBarbeiro, currentPage)
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error)
      alert('Erro ao adicionar cliente')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-white">Carregando clientes...</div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Clientes</h1>
          <p className="text-sm sm:text-base text-red-300">Total: {totalClientes} clientes cadastrados</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true)
            setEditForm({
              nome_completo: '',
              telefone: '',
              email: '',
              data_nascimento: '',
              profissao: '',
              estado_civil: '',
              tem_filhos: '',
              nomes_filhos: [] as string[],
              idades_filhos: [] as string[],
              estilo_cabelo: '',
              preferencias_corte: '',
              tipo_bebida: '',
              alergias: '',
              frequencia_retorno: '',
              profissional_preferido: '',
              observacoes: '',
              is_vip: false,
              como_soube: '',
              gosta_conversar: '',
              menory_long: '',
              tratamento: '',
              ultimo_servico: '',
              plano_id: null
            })
          }}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Busca e Filtros */}
      <Card className="bg-zinc-800/50 border-zinc-700/50">
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            {/* Campo de Busca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-700/50 border border-zinc-600/50 rounded-lg text-sm sm:text-base text-white placeholder-zinc-500"
                />
              </div>

              <select
                value={selectedBarbeiro}
                onChange={(e) => {
                  setSelectedBarbeiro(e.target.value)
                  setCurrentPage(1)
                  loadClientes(searchTerm, e.target.value, 1)
                }}
                className="px-3 sm:px-4 py-2 bg-zinc-700/50 border border-zinc-600/50 rounded-lg text-sm sm:text-base text-white"
              >
                <option value="">Todos os Barbeiros</option>
                {profissionais.map(prof => (
                  <option key={prof.id} value={prof.nome}>{prof.nome}</option>
                ))}
              </select>

              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                Buscar
              </button>
            </div>

            {/* Filtros VIP / Todos */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setFiltroVIP(false)
                    setCurrentPage(1)
                    router.push('/dashboard/clientes')
                  }}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                    !filtroVIP
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Todos</span>
                </button>

                <button
                  onClick={() => {
                    setFiltroVIP(true)
                    setCurrentPage(1)
                    router.push('/dashboard/clientes?filter=vip')
                  }}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                    filtroVIP
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span>Apenas VIPs</span>
                </button>
              </div>

              {filtroVIP && (
                <div className="text-xs sm:text-sm text-yellow-400">
                  Mostrando clientes VIP (marcados manualmente ou com 5+ visitas)
                </div>
              )}
            </div>

            {/* Info de Paginação */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-zinc-400 pt-2 border-t border-zinc-700/50">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Mostrando {clientes.length} de {totalClientes} clientes</span>
              </div>
              <span>Página {currentPage} de {totalPages}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <div className="grid gap-4">
        {clientes.length === 0 ? (
          <Card className="bg-red-800/30 border-red-700/50">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhum cliente encontrado</h3>
              <p className="text-red-300">Tente ajustar os filtros de busca.</p>
            </CardContent>
          </Card>
        ) : (
          clientes.map((cliente) => (
            <Card key={cliente.id} className="bg-red-800/30 border-red-700/50 hover:bg-red-800/40 transition-colors">
              <CardContent className="p-3 sm:p-4">
                {/* Layout Mobile */}
                <div className="lg:hidden space-y-3">
                  {/* Nome e Avatar */}
                  <div className="flex items-start space-x-3">
                    <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xl">
                        {cliente.nome_completo?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-base truncate">{cliente.nome_completo || 'Nome não informado'}</span>
                        {cliente.is_vip && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                      {cliente.created_at && (
                        <div className="flex items-center space-x-1 text-xs text-zinc-400">
                          <Calendar className="w-3 h-3" />
                          <span>Cliente desde {new Date(cliente.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contatos */}
                  <div className="space-y-2 bg-zinc-800/30 rounded-lg p-3">
                    {cliente.telefone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-white">{cliente.telefone}</span>
                      </div>
                    )}
                    {cliente.email && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-white truncate">{cliente.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Informações Adicionais */}
                  {(cliente.profissional_preferido || clientesVisitas[cliente.id] !== undefined) && (
                    <div className="space-y-2">
                      {cliente.profissional_preferido && (
                        <div className="text-sm text-red-300 bg-red-900/20 rounded-lg p-2">
                          ✂️ Barbeiro preferido: {cliente.profissional_preferido}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {clientesVisitas[cliente.id] !== undefined && (
                          <span className={`text-xs px-3 py-1.5 rounded-lg ${
                            clientesVisitas[cliente.id] >= 5
                              ? 'bg-yellow-400/20 text-yellow-400 font-semibold'
                              : 'bg-zinc-700/50 text-zinc-400'
                          }`}>
                            📊 {clientesVisitas[cliente.id]} {clientesVisitas[cliente.id] === 1 ? 'visita' : 'visitas'}
                          </span>
                        )}
                        {cliente.is_vip && (
                          <span className="text-xs font-semibold bg-yellow-400/20 text-yellow-400 px-3 py-1.5 rounded-lg">
                            ⭐ VIP Manual
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-red-700/30">
                    <button
                      onClick={() => {
                        setClienteParaMensagem(cliente)
                        setMensagem('')
                      }}
                      className="flex flex-col items-center justify-center space-y-1 p-2 text-green-300 hover:text-white hover:bg-green-700/30 rounded-lg transition-colors border border-green-700/30"
                      title="Enviar mensagem"
                    >
                      <Send className="w-4 h-4" />
                      <span className="text-xs">Mensagem</span>
                    </button>
                    <button
                      onClick={() => handleEdit(cliente)}
                      className="flex flex-col items-center justify-center space-y-1 p-2 text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors border border-zinc-600/50"
                      title="Editar cliente"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-xs">Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
                      className="flex flex-col items-center justify-center space-y-1 p-2 text-red-300 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors border border-red-700/50"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs">Excluir</span>
                    </button>
                  </div>
                </div>

                {/* Layout Desktop */}
                <div className="hidden lg:flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {cliente.nome_completo?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-white text-lg">{cliente.nome_completo || 'Nome não informado'}</span>
                        {cliente.is_vip && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-red-300">
                        {cliente.telefone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{cliente.telefone}</span>
                          </span>
                        )}
                        {cliente.email && (
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{cliente.email}</span>
                          </span>
                        )}
                        {cliente.created_at && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Desde {new Date(cliente.created_at).toLocaleDateString('pt-BR')}</span>
                          </span>
                        )}
                      </div>

                      {cliente.profissional_preferido && (
                        <div className="mt-1 text-sm text-red-300">
                          ✂️ Preferência: {cliente.profissional_preferido}
                        </div>
                      )}

                      {/* Mostrar número de visitas e tipo de VIP */}
                      <div className="mt-1 text-sm flex items-center gap-3">
                        {clientesVisitas[cliente.id] !== undefined && (
                          <span className={`${
                            clientesVisitas[cliente.id] >= 5
                              ? 'text-yellow-400 font-semibold'
                              : 'text-zinc-400'
                          }`}>
                            📊 {clientesVisitas[cliente.id]} {clientesVisitas[cliente.id] === 1 ? 'visita' : 'visitas'}
                          </span>
                        )}
                        {cliente.is_vip && (
                          <span className="text-yellow-400 font-semibold bg-yellow-400/10 px-2 py-0.5 rounded">
                            ⭐ VIP Manual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setClienteParaMensagem(cliente)
                        setMensagem('')
                      }}
                      className="p-2 text-green-300 hover:text-white hover:bg-green-700/50 rounded-lg transition-colors"
                      title="Enviar mensagem"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(cliente)}
                      className="p-2 text-red-300 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors"
                      title="Editar cliente"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
                      className="p-2 text-red-300 hover:text-white hover:bg-red-700/50 rounded-lg transition-colors"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center space-x-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center space-x-2">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNum
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors"
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição/Adicionar */}
      {(editingCliente || showAddForm) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-zinc-800 rounded-lg p-6 max-w-2xl w-full border border-zinc-700 my-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-400">Dados Pessoais</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={editForm.nome_completo}
                      onChange={(e) => setEditForm({ ...editForm, nome_completo: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Telefone *</label>
                    <input
                      type="text"
                      value={editForm.telefone}
                      onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={editForm.data_nascimento}
                      onChange={(e) => setEditForm({ ...editForm, data_nascimento: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Profissão</label>
                    <input
                      type="text"
                      value={editForm.profissao}
                      onChange={(e) => setEditForm({ ...editForm, profissao: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Estado Civil</label>
                    <select
                      value={editForm.estado_civil}
                      onChange={(e) => setEditForm({ ...editForm, estado_civil: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Tem Filhos?</label>
                    <select
                      value={editForm.tem_filhos}
                      onChange={(e) => setEditForm({ ...editForm, tem_filhos: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Como Conheceu a Barbearia?</label>
                    <select
                      value={editForm.como_soube}
                      onChange={(e) => setEditForm({ ...editForm, como_soube: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Google">Google</option>
                      <option value="Indicação">Indicação de Amigo</option>
                      <option value="Passando na Rua">Passando na Rua</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Gosta de Conversar?</label>
                    <select
                      value={editForm.gosta_conversar}
                      onChange={(e) => setEditForm({ ...editForm, gosta_conversar: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Sim">Sim, gosta de conversar</option>
                      <option value="Não">Prefere silêncio</option>
                      <option value="Às vezes">Depende do dia</option>
                    </select>
                  </div>
                </div>

                {editForm.tem_filhos === 'Sim' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Nomes dos Filhos (separados por vírgula)</label>
                      <input
                        type="text"
                        value={editForm.nomes_filhos.join(', ')}
                        onChange={(e) => setEditForm({ ...editForm, nomes_filhos: e.target.value.split(',').map(s => s.trim()) })}
                        className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Idades dos Filhos (separadas por vírgula)</label>
                      <input
                        type="text"
                        value={editForm.idades_filhos.join(', ')}
                        onChange={(e) => setEditForm({ ...editForm, idades_filhos: e.target.value.split(',').map(s => s.trim()) })}
                        className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preferências de Serviço */}
              <div className="space-y-4 border-t border-zinc-700 pt-4">
                <h3 className="text-lg font-semibold text-red-400">Preferências de Serviço</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Estilo de Cabelo</label>
                    <input
                      type="text"
                      value={editForm.estilo_cabelo}
                      onChange={(e) => setEditForm({ ...editForm, estilo_cabelo: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Preferências de Corte</label>
                    <input
                      type="text"
                      value={editForm.preferencias_corte}
                      onChange={(e) => setEditForm({ ...editForm, preferencias_corte: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Barbeiro Preferido</label>
                    <select
                      value={editForm.profissional_preferido}
                      onChange={(e) => setEditForm({ ...editForm, profissional_preferido: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Nenhum</option>
                      {profissionais.map(prof => (
                        <option key={prof.id} value={prof.nome}>{prof.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Plano de Pacote</label>
                    <select
                      value={editForm.plano_id || ''}
                      onChange={(e) => setEditForm({ ...editForm, plano_id: e.target.value || null })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Nenhum plano</option>
                      {planos.map(plano => (
                        <option key={plano.id} value={plano.id}>
                          {plano.nome} - R$ {plano.valor_total.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-500 mt-1">Selecione um plano de pacote ativo para o cliente</p>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Frequência de Retorno</label>
                    <select
                      value={editForm.frequencia_retorno}
                      onChange={(e) => setEditForm({ ...editForm, frequencia_retorno: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Quinzenal">Quinzenal</option>
                      <option value="Mensal">Mensal</option>
                      <option value="Bimestral">Bimestral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Tipo de Bebida Preferida</label>
                    <input
                      type="text"
                      value={editForm.tipo_bebida}
                      onChange={(e) => setEditForm({ ...editForm, tipo_bebida: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                      placeholder="Ex: Café, Whisky, Água..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Alergias</label>
                    <input
                      type="text"
                      value={editForm.alergias}
                      onChange={(e) => setEditForm({ ...editForm, alergias: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                      placeholder="Ex: Pomada X, Produto Y..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Tratamento Preferido</label>
                    <input
                      type="text"
                      value={editForm.tratamento}
                      onChange={(e) => setEditForm({ ...editForm, tratamento: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                      placeholder="Ex: Hidratação, Relaxamento..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Último Serviço</label>
                    <input
                      type="text"
                      value={editForm.ultimo_servico}
                      onChange={(e) => setEditForm({ ...editForm, ultimo_servico: e.target.value })}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white"
                      placeholder="Ex: Corte + Barba"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Histórico e Memória */}
              <div className="space-y-4 border-t border-zinc-700 pt-4">
                <h3 className="text-lg font-semibold text-red-400">Histórico e Memória</h3>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Memória de Longo Prazo</label>
                  <textarea
                    value={editForm.menory_long}
                    onChange={(e) => setEditForm({ ...editForm, menory_long: e.target.value })}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white h-32"
                    placeholder="Histórico de conversas, preferências detalhadas, informações importantes sobre o cliente..."
                  />
                  <p className="text-xs text-zinc-500 mt-1">Este campo é usado pelo agente IA para lembrar de detalhes importantes sobre o cliente</p>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-4 border-t border-zinc-700 pt-4">
                <h3 className="text-lg font-semibold text-red-400">Observações Gerais</h3>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Observações</label>
                  <textarea
                    value={editForm.observacoes}
                    onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white h-24"
                    placeholder="Anotações sobre o cliente..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_vip"
                    checked={editForm.is_vip}
                    onChange={(e) => setEditForm({ ...editForm, is_vip: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_vip" className="text-sm text-zinc-400 flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>Cliente VIP</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6 border-t border-zinc-700 pt-4">
              <button
                onClick={editingCliente ? handleSaveEdit : handleAddCliente}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingCliente ? 'Salvar Alterações' : 'Adicionar Cliente'}
              </button>
              <button
                onClick={() => {
                  setEditingCliente(null)
                  setShowAddForm(false)
                }}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Enviar Mensagem */}
      {clienteParaMensagem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-lg p-6 max-w-lg w-full border border-zinc-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                <Send className="w-6 h-6 text-green-400" />
                <span>Enviar Mensagem</span>
              </h2>
              <button
                onClick={() => {
                  setClienteParaMensagem(null)
                  setMensagem('')
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Info do Cliente */}
              <div className="bg-zinc-700/50 rounded-lg p-4 border border-zinc-600/50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {clienteParaMensagem.nome_completo?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-white">{clienteParaMensagem.nome_completo}</div>
                    <div className="text-sm text-zinc-400 flex items-center space-x-1">
                      <Phone className="w-3 h-3" />
                      <span>{clienteParaMensagem.telefone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campo de Mensagem */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Mensagem</label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite a mensagem que será enviada via WhatsApp..."
                  rows={5}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-3 py-2 text-white resize-none placeholder-zinc-500"
                  autoFocus
                />
              </div>

              {/* Status do Webhook */}
              <div className="flex items-center space-x-2 text-sm">
                {webhookUrl ? (
                  <span className="text-green-400">✓ Webhook configurado</span>
                ) : (
                  <span className="text-yellow-400">⚠ Configure o webhook em Configurações primeiro</span>
                )}
              </div>

              {/* Botões */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleEnviarMensagem}
                  disabled={enviandoMensagem || !webhookUrl || !mensagem}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{enviandoMensagem ? 'Enviando...' : 'Enviar Mensagem'}</span>
                </button>
                <button
                  onClick={() => {
                    setClienteParaMensagem(null)
                    setMensagem('')
                  }}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-800/30 border-red-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-red-400" />
              <div>
                <div className="text-lg font-bold text-white">{clientes.length}</div>
                <div className="text-sm text-red-300">Total de Clientes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-800/30 border-red-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {clientes.filter(c => c.is_vip).length}
                </div>
                <div className="text-sm text-red-300">Clientes VIP</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-800/30 border-red-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-lg font-bold text-white">
                  {clientes.filter(c => {
                    const cadastro = new Date(c.created_at)
                    const umMesAtras = new Date()
                    umMesAtras.setMonth(umMesAtras.getMonth() - 1)
                    return cadastro >= umMesAtras
                  }).length}
                </div>
                <div className="text-sm text-red-300">Novos (30 dias)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="text-white">Carregando clientes...</div>
      </div>
    }>
      <ClientesPageContent />
    </Suspense>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agendamentos/horarios-disponiveis
 *
 * Retorna todos os horários disponíveis para um dia específico
 *
 * Query Params:
 * - data: string (YYYY-MM-DD) - Data para consultar
 * - barbeiro: string (opcional) - Nome do barbeiro específico
 * - servico_ids: string (opcional) - IDs dos serviços separados por vírgula (para calcular duração)
 *
 * Exemplo: /api/agendamentos/horarios-disponiveis?data=2025-12-20&barbeiro=Hiago
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data')
    const barbeiroNome = searchParams.get('barbeiro')
    const servicoIdsParam = searchParams.get('servico_ids')

    if (!data) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetro "data" é obrigatório',
        errors: ['Data não fornecida']
      }, { status: 400 })
    }

    // Validar formato da data
    const dataRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dataRegex.test(data)) {
      return NextResponse.json({
        success: false,
        message: 'Formato de data inválido. Use YYYY-MM-DD',
        errors: ['Formato de data inválido']
      }, { status: 400 })
    }

    // Buscar configurações da barbearia
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('*')
      .maybeSingle()

    // Se não encontrar configurações, usar valores padrão
    const configPadrao = {
      horarios_por_dia: {
        'Domingo': { abertura: '09:00', fechamento: '18:00', ativo: false },
        'Segunda': { abertura: '09:00', fechamento: '19:00', ativo: true },
        'Terça': { abertura: '09:00', fechamento: '19:00', ativo: true },
        'Quarta': { abertura: '09:00', fechamento: '19:00', ativo: true },
        'Quinta': { abertura: '09:00', fechamento: '19:00', ativo: true },
        'Sexta': { abertura: '09:00', fechamento: '19:00', ativo: true },
        'Sábado': { abertura: '09:00', fechamento: '18:00', ativo: true }
      }
    }

    const configAtual = config || configPadrao

    // Verificar dia da semana
    const dataParsed = new Date(data + 'T00:00:00')
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const diaSemana = diasSemana[dataParsed.getDay()]

    // Verificar se a barbearia funciona neste dia
    const horarioDia = configAtual.horarios_por_dia?.[diaSemana]
    if (!horarioDia || !horarioDia.ativo) {
      return NextResponse.json({
        success: false,
        message: `Barbearia fechada em ${diaSemana}`,
        data: {
          horarios: [],
          dia_fechado: true,
          dia_semana: diaSemana
        }
      })
    }

    const horarioAbertura = horarioDia.abertura || '09:00'
    const horarioFechamento = horarioDia.fechamento || '19:00'

    // Calcular duração total dos serviços (se fornecido)
    let duracaoTotal = 30 // Padrão
    if (servicoIdsParam) {
      const servicoIds = servicoIdsParam.split(',')
      const { data: servicos } = await supabase
        .from('servicos')
        .select('duracao_minutos')
        .in('id', servicoIds)

      if (servicos && servicos.length > 0) {
        duracaoTotal = servicos.reduce((sum, s) => sum + (s.duracao_minutos || 30), 0)
      }
    }

    // Buscar barbeiro específico ou todos
    let profissionais: any[] = []
    if (barbeiroNome) {
      const { data: prof } = await supabase
        .from('profissionais')
        .select('*')
        .ilike('nome', `%${barbeiroNome}%`)
        .eq('ativo', true)
        .single()

      if (!prof) {
        return NextResponse.json({
          success: false,
          message: `Barbeiro "${barbeiroNome}" não encontrado ou inativo`,
          errors: ['Barbeiro não encontrado']
        }, { status: 404 })
      }
      profissionais = [prof]
    } else {
      const { data: profs } = await supabase
        .from('profissionais')
        .select('*')
        .eq('ativo', true)
      profissionais = profs || []
    }

    if (profissionais.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum barbeiro ativo encontrado',
        errors: ['Nenhum barbeiro disponível']
      }, { status: 404 })
    }

    // Buscar agendamentos existentes para este dia
    const { data: agendamentosExistentes } = await supabase
      .from('agendamentos')
      .select(`
        id,
        hora_inicio,
        profissional_id,
        profissionais (nome),
        agendamento_servicos (duracao_minutos)
      `)
      .eq('data_agendamento', data)
      .in('status', ['agendado', 'confirmado', 'em_andamento'])

    // Gerar slots de horário (intervalos de 30min)
    const slots: string[] = []
    const [horaIni, minIni] = horarioAbertura.split(':').map(Number)
    const [horaFim, minFim] = horarioFechamento.split(':').map(Number)

    let horaAtual = horaIni
    let minAtual = minIni

    while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
      const horarioFormatado = `${String(horaAtual).padStart(2, '0')}:${String(minAtual).padStart(2, '0')}`
      slots.push(horarioFormatado)

      // Incrementar 30 minutos
      minAtual += 30
      if (minAtual >= 60) {
        minAtual -= 60
        horaAtual += 1
      }
    }

    // Verificar disponibilidade de cada slot
    const horariosDisponiveis: string[] = []
    const horariosOcupados: any[] = []

    for (const slot of slots) {
      // Verificar se algum barbeiro está disponível neste horário
      let algumBarbeiroDisponivel = false

      for (const prof of profissionais) {
        const ocupado = agendamentosExistentes?.some(ag => {
          if (ag.profissional_id !== prof.id) return false

          const horaAgendamento = ag.hora_inicio
          const duracaoAgendamento = ag.agendamento_servicos?.reduce((sum: number, s: any) =>
            sum + (s.duracao_minutos || 30), 0) || 30

          // Verificar conflito de horário
          const [horaAg, minAg] = horaAgendamento.split(':').map(Number)
          const [horaSlot, minSlot] = slot.split(':').map(Number)

          const inicioAg = horaAg * 60 + minAg
          const fimAg = inicioAg + duracaoAgendamento
          const inicioSlot = horaSlot * 60 + minSlot
          const fimSlot = inicioSlot + duracaoTotal

          // Conflito se houver sobreposição
          return (inicioSlot < fimAg && fimSlot > inicioAg)
        })

        if (!ocupado) {
          algumBarbeiroDisponivel = true
          break
        }
      }

      if (algumBarbeiroDisponivel) {
        horariosDisponiveis.push(slot)
      } else {
        horariosOcupados.push({
          horario: slot,
          motivo: 'Todos os barbeiros ocupados'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${horariosDisponiveis.length} horários disponíveis encontrados`,
      data: {
        data: data,
        dia_semana: diaSemana,
        horario_abertura: horarioAbertura,
        horario_fechamento: horarioFechamento,
        duracao_estimada: duracaoTotal,
        barbeiros_disponiveis: profissionais.length,
        barbeiros: profissionais.map(p => ({ id: p.id, nome: p.nome })),
        horarios: horariosDisponiveis,
        horarios_ocupados: horariosOcupados,
        total_disponiveis: horariosDisponiveis.length,
        total_ocupados: horariosOcupados.length
      }
    })

  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar horários disponíveis',
      errors: [error instanceof Error ? error.message : 'Erro desconhecido']
    }, { status: 500 })
  }
}

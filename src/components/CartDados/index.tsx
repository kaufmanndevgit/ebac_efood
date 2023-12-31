import { useSelector, useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { usePurchaseMutation } from '../../services/api'
import { CartState } from '../../store/reducers/cart'
import { changePage } from '../../store/reducers/cart'
import { addOrder } from '../../store/reducers/orders'
import { RootReducer } from '../../store'
import { formataPreco } from '../CardProduto'
import * as S from './styles'

export type typeCartDados = {
  tipo: 'entrega' | 'pagamento' | 'realizado'
}

type CepDados = {
  localidade: string
  logradouro: string
}

const CartDados = ({ tipo }: typeCartDados) => {
  const { itens } = useSelector((state: RootReducer) => state.cart)
  const [tentativaPaginaEntrega, setTentativaPaginaEntrega] = useState(false)
  const [tipoPagina, setTipoPagina] = useState(tipo)
  const [cepValido, setCepValido] = useState(true)
  const [logradouroTouched, setLogradouroTouched] = useState(false)
  const [cidadeTouched, setCidadeTouched] = useState(false)
  const [logradouroVazio, setLogradouroVazio] = useState(false)
  const [cidadeVazia, setCidadeVazia] = useState(false)
  const [dataCep, setDataCep] = useState<CepDados>()
  const [purchase, { data, isSuccess, isLoading }] = usePurchaseMutation()
  const dispatch = useDispatch()

  const ProdutosCheckOut: TipoProdutoCheckout[] = itens.map((item) => ({
    id: item.id,
    price: item.preco as number
  }))

  const mudarPagina = (pagina: CartState['cartPage']) => {
    dispatch(changePage(pagina))
  }

  const getTotalPrice = () => {
    return itens.reduce((acumulador, valorAtual) => {
      return (acumulador += valorAtual.preco ? valorAtual.preco : 0)
    }, 0)
  }

  const form = useFormik({
    initialValues: {
      nomeEntrega: '',
      enderecoEntrega: '',
      cidadeEntrega: '',
      cepEntrega: '',
      numeroEntrega: '',
      complementoEntrega: '',
      nomeCartao: '',
      numeroCartao: '',
      numeroCvv: '',
      mesVencimento: '',
      anoVencimento: ''
    },
    validationSchema: Yup.object({
      nomeEntrega: Yup.string()
        .min(5, 'O nome deve ter pelo menos 5 caracteres')
        .required('Campo obrigatório'),
      enderecoEntrega: Yup.string().required('Campo obrigatório'),
      cidadeEntrega: Yup.string().required('Campo obrigatório'),
      numeroEntrega: Yup.number().required('Campo obrigatório'),
      cepEntrega: Yup.string()
        .min(9, 'Este CEP não é válido')
        .test('validação', 'CEP inválido', () => cepValido)
        .required('Campo obrigatório'),
      nomeCartao: Yup.string().required('Campo obrigatório'),
      numeroCvv: Yup.string().min(3, 'Nº Inválido').required('Nº Inválido'),
      numeroCartao: Yup.string()
        .min(19, 'Cartão inválido')
        .required('Campo obrigatório'),
      mesVencimento: Yup.number()
        .max(12, 'Insira um mês válido')
        .required('Campo obrigatório')
        .min(1, 'Insira um mês válido'),
      anoVencimento: Yup.number()
        .required('Campo obrigatório')
        .min(2024, 'Insira um ano válido')
        .max(2050, 'Insira um ano válido')
    }),
    enableReinitialize: true,
    validateOnChange: true,
    onSubmit: (values) => {
      purchase({
        delivery: {
          receiver: values.nomeEntrega,
          address: {
            description: values.enderecoEntrega,
            city: values.cidadeEntrega,
            zipCode: values.cepEntrega,
            number: values.numeroEntrega,
            complement: values.complementoEntrega
          }
        },
        payment: {
          card: {
            name: values.nomeCartao,
            number: values.numeroCartao,
            code: values.numeroCvv,
            expires: {
              month: values.mesVencimento,
              year: values.anoVencimento
            }
          }
        },
        products: ProdutosCheckOut.map((item) => ({
          id: item.id,
          price: item.price
        }))
      })
        .unwrap()
        .then(() => dispatch(addOrder(ProdutosCheckOut)))
    }
  })

  useEffect(() => {
    const inputElemento = document.querySelector(
      '#nomeEntrega'
    ) as HTMLInputElement
    inputElemento && inputElemento.select()
  }, [])

  useEffect(() => {
    const fetchCep = async () => {
      const respostaCep = await fetch(
        `https://viacep.com.br/ws/${form.values.cepEntrega}/json`
      )
      const dadosCep = await respostaCep.json()
      if (dadosCep.erro == true) {
        setCepValido(false)
      } else {
        setCepValido(true)
        setDataCep(dadosCep)
      }
    }
    if (form.values.cepEntrega.length == 9) {
      fetchCep()
    }
  }, [form.values.cepEntrega])

  useEffect(() => {
    form.values.cidadeEntrega == ''
      ? setCidadeVazia(true)
      : setCidadeVazia(false)
    setCidadeTouched(true)
  }, [form.values.cidadeEntrega])

  useEffect(() => {
    cepValido && setCidadeTouched(false)
  }, [cepValido])

  useEffect(() => {
    cepValido && setLogradouroTouched(false)
  }, [cepValido])

  useEffect(() => {
    form.values.enderecoEntrega == ''
      ? setLogradouroVazio(true)
      : setLogradouroVazio(false)
    setLogradouroTouched(true)
  }, [form.values.enderecoEntrega])

  const getErrorMessage = (fieldName: string, message?: string) => {
    const isInvalid: boolean = fieldName in form.errors
    const isAttempted: boolean = tentativaPaginaEntrega
    const hasError = isInvalid && isAttempted
    return hasError ? message : ''
  }

  const getErrorMessagePagamento = (fieldName: string, message?: string) => {
    const isInvalid: boolean = fieldName in form.errors
    const isAttempted: boolean = form.submitCount > 0
    const hasError = isInvalid && isAttempted
    return hasError ? message : ''
  }

  const checkInputhasError = (fieldName: string) => {
    const isInvalid: boolean = fieldName in form.errors
    const isAttempted: boolean = tentativaPaginaEntrega
    const hasError = isInvalid && isAttempted
    return hasError
  }

  const checkInputhasErrorPagamento = (fieldName: string) => {
    const isInvalid: boolean = fieldName in form.errors
    const isAttempted: boolean = form.submitCount > 0
    const hasError = isInvalid && isAttempted
    return hasError
  }

  const checkDeliveryError = () => {
    const isAttempted: boolean = tentativaPaginaEntrega
    const formInvalid =
      'nomeEntrega' in form.errors ||
      'enderecoEntrega' in form.errors ||
      'cidadeEntrega' in form.errors ||
      'numeroEntrega' in form.errors ||
      'cepEntrega' in form.errors
    return isAttempted && formInvalid
  }

  const VerificarPaginaEntrega = () => {
    cepValido &&
      form.values.cidadeEntrega == '' &&
      form.setFieldValue('cidadeEntrega', dataCep?.localidade, true)

    cepValido &&
      form.values.cidadeEntrega !== '' &&
      cidadeTouched == false &&
      form.setFieldValue('cidadeEntrega', dataCep?.localidade, true)

    cepValido &&
      form.values.enderecoEntrega == '' &&
      form.setFieldValue('enderecoEntrega', dataCep?.logradouro, true)

    cepValido &&
      form.values.enderecoEntrega !== '' &&
      logradouroTouched == false
    form.setFieldValue('enderecoEntrega', dataCep?.logradouro, true)

    setTentativaPaginaEntrega(true)
    const formInvalid =
      'nomeEntrega' in form.errors ||
      (cepValido && form.values.enderecoEntrega !== '' && logradouroVazio) ||
      (!cepValido && 'enderecoEntrega' in form.errors) ||
      (cepValido && form.values.cidadeEntrega !== '' && cidadeVazia) ||
      (!cepValido && 'cidadeEntrega' in form.errors) ||
      'numeroEntrega' in form.errors ||
      'cepEntrega' in form.errors
    console.log(cepValido)
    console.log(form.errors)
    !formInvalid && setTipoPagina('pagamento')
  }

  const checkGeneralError = () => {
    const isAttempted: boolean = form.submitCount > 0
    const formInvalid = !form.isValid
    return isAttempted && formInvalid
  }

  return (
    <>
      {data && isSuccess ? (
        <S.DivDadosEnd>
          <S.TituloDados>
            Pedido realizado - NÚMERO {data.orderId}
          </S.TituloDados>
          <S.TextoFormulario>
            Estamos felizes em informar que seu pedido já está em processo de
            preparação e, em breve, será entregue no endereço fornecido.
            <br />
            <br />
            Gostaríamos de ressaltar que nossos entregadores não estão
            autorizados a realizar cobranças extras.
            <br />
            <br />
            Lembre-se da importância de higienizar as mãos após o recebimento do
            pedido, garantindo assim sua segurança e bem-estar durante a
            refeição.
            <br />
            <br />
            Esperamos que desfrute de uma deliciosa e agradável experiência
            gastronômica. Bom apetite!
          </S.TextoFormulario>
          <Link to={'/'} type="button">
            <S.ButtonContainer>Concluir</S.ButtonContainer>
          </Link>
        </S.DivDadosEnd>
      ) : (
        <S.SuperForm onSubmit={form.handleSubmit}>
          <S.DivDados className={tipoPagina === 'entrega' ? 'visible' : ''}>
            <S.TituloDados>Entrega</S.TituloDados>
            <S.FormularioDados>
              <S.FormularioItem>
                <label htmlFor="nomeEntrega">Quem irá receber</label>
                <S.InputFormularioTexto
                  id="nomeEntrega"
                  name="nomeEntrega"
                  type="text"
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  className={checkInputhasError('nomeEntrega') ? 'error' : ''}
                />
                {'nomeEntrega' in form.errors && tentativaPaginaEntrega && (
                  <S.ErroMensagem>
                    {getErrorMessage('nomeEntrega', form.errors.nomeEntrega)}
                  </S.ErroMensagem>
                )}
              </S.FormularioItem>
              <S.FormularioItem>
                <label htmlFor="enderecoEntrega">Endereço</label>
                <S.InputFormularioTexto
                  id="enderecoEntrega"
                  name="enderecoEntrega"
                  type="text"
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  onClick={() => {
                    cepValido &&
                      dataCep &&
                      (form.values.enderecoEntrega = dataCep.logradouro)
                    setDataCep({
                      localidade: '',
                      logradouro: ''
                    })
                  }}
                  value={
                    cepValido && dataCep && dataCep.localidade != ''
                      ? dataCep.logradouro
                      : form.values.enderecoEntrega
                  }
                  className={
                    checkInputhasError('enderecoEntrega') ? 'error' : ''
                  }
                />
                {'enderecoEntrega' in form.errors && tentativaPaginaEntrega && (
                  <S.ErroMensagem>
                    {getErrorMessage(
                      'enderecoEntrega',
                      form.errors.enderecoEntrega
                    )}
                  </S.ErroMensagem>
                )}
              </S.FormularioItem>
              <S.FormularioItem>
                <label htmlFor="cidadeEntrega">Cidade</label>
                <S.InputFormularioTexto
                  id="cidadeEntrega"
                  name="cidadeEntrega"
                  type="text"
                  onSelect={form.handleChange}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  onClick={() => {
                    cepValido &&
                      dataCep &&
                      (form.values.cidadeEntrega = dataCep.localidade)
                    setDataCep({
                      localidade: '',
                      logradouro: ''
                    })
                  }}
                  value={
                    cepValido && dataCep && dataCep.localidade != ''
                      ? dataCep.localidade
                      : form.values.cidadeEntrega
                  }
                  className={checkInputhasError('cidadeEntrega') ? 'error' : ''}
                />
                {'cidadeEntrega' in form.errors && tentativaPaginaEntrega && (
                  <S.ErroMensagem>
                    {getErrorMessage(
                      'cidadeEntrega',
                      form.errors.cidadeEntrega
                    )}
                  </S.ErroMensagem>
                )}
              </S.FormularioItem>
              <S.DivMesmaLinhaSpecial>
                <S.FormularioItem>
                  <label htmlFor="cepEntrega">CEP</label>
                  <S.InputFormularioMask
                    id="cepEntrega"
                    name="cepEntrega"
                    mask="99999-999"
                    maskChar={''}
                    onChange={form.handleChange}
                    onBlur={form.handleBlur}
                    className={checkInputhasError('cepEntrega') ? 'error' : ''}
                  />
                  {'cepEntrega' in form.errors && tentativaPaginaEntrega && (
                    <S.ErroMensagem>
                      {getErrorMessage('cepEntrega', form.errors.cepEntrega)}
                    </S.ErroMensagem>
                  )}
                </S.FormularioItem>
                <S.FormularioItem>
                  <label htmlFor="numeroEntrega">Número</label>
                  <S.InputFormularioTexto
                    id="numeroEntrega"
                    name="numeroEntrega"
                    type="number"
                    onChange={form.handleChange}
                    onBlur={form.handleBlur}
                    className={
                      checkInputhasError('numeroEntrega') ? 'error' : ''
                    }
                  />
                  {'numeroEntrega' in form.errors && tentativaPaginaEntrega && (
                    <S.ErroMensagem>
                      {getErrorMessage(
                        'numeroEntrega',
                        form.errors.numeroEntrega
                      )}
                    </S.ErroMensagem>
                  )}
                </S.FormularioItem>
              </S.DivMesmaLinhaSpecial>
              <S.FormularioItem>
                <label htmlFor="complementoEntrega">
                  Complemento (opcional)
                </label>
                <S.InputFormularioTexto
                  id="complementoEntrega"
                  name="complementoEntrega"
                  type="text"
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                />
              </S.FormularioItem>
            </S.FormularioDados>
            <S.DivBotoes>
              <S.ButtonContainer
                type="button"
                onClick={() => VerificarPaginaEntrega()}
              >
                Continuar com o pagamento
              </S.ButtonContainer>
              {checkDeliveryError() && (
                <S.ErroMensagemGeral>
                  Por favor, corrija os erros no formulário
                </S.ErroMensagemGeral>
              )}
              <S.ButtonContainer onClick={() => mudarPagina('cart')}>
                Voltar para o carrinho
              </S.ButtonContainer>
            </S.DivBotoes>
          </S.DivDados>
          <S.DivDados className={tipoPagina === 'pagamento' ? 'visible' : ''}>
            <S.TituloDados>
              Pagamento - Valor a Pagar {formataPreco(getTotalPrice())}
            </S.TituloDados>
            <S.FormularioDados>
              <S.FormularioItem>
                <label htmlFor="nomeCartao">Nome no Cartão</label>
                <S.InputFormularioTexto
                  id="nomeCartao"
                  name="nomeCartao"
                  type="text"
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  className={
                    checkInputhasErrorPagamento('nomeCartao') ? 'error' : ''
                  }
                />
                {'nomeCartao' in form.errors && form.submitCount > 0 && (
                  <S.ErroMensagem>
                    {getErrorMessagePagamento(
                      'nomeCartao',
                      form.errors.nomeCartao
                    )}
                  </S.ErroMensagem>
                )}
              </S.FormularioItem>
              <S.DivMesmaLinhaCVV>
                <S.FormularioItem>
                  <label htmlFor="numeroCartao">Número do Cartão</label>
                  <S.InputFormularioMaskCartao
                    id="numeroCartao"
                    name="numeroCartao"
                    maskChar={''}
                    mask="9999 9999 9999 9999"
                    onChange={form.handleChange}
                    onBlur={form.handleBlur}
                    className={
                      checkInputhasErrorPagamento('numeroCartao') ? 'error' : ''
                    }
                  />
                  {'numeroCartao' in form.errors && form.submitCount > 0 && (
                    <S.ErroMensagem>
                      {getErrorMessagePagamento(
                        'numeroCartao',
                        form.errors.numeroCartao
                      )}
                    </S.ErroMensagem>
                  )}
                </S.FormularioItem>
                <S.FormularioItem>
                  <label htmlFor="numeroCvv">CVV</label>
                  <S.InputFormularioMaskCvv
                    id="numeroCvv"
                    name="numeroCvv"
                    maskChar={''}
                    mask="999"
                    type="string"
                    onChange={form.handleChange}
                    onBlur={form.handleBlur}
                    className={
                      checkInputhasErrorPagamento('numeroCvv') ? 'error' : ''
                    }
                  />
                  {'numeroCvv' in form.errors && form.submitCount > 0 && (
                    <S.ErroMensagem>
                      {getErrorMessagePagamento(
                        'numeroCvv',
                        form.errors.numeroCvv
                      )}
                    </S.ErroMensagem>
                  )}
                </S.FormularioItem>
              </S.DivMesmaLinhaCVV>
              <S.DivMesmaLinha>
                <S.FormularioItem>
                  <label htmlFor="mesVencimento">Mês de Vencimento</label>
                  <S.InputFormularioMaskData
                    id="mesVencimento"
                    name="mesVencimento"
                    maskChar={''}
                    mask="99"
                    onChange={form.handleChange}
                    onBlur={form.handleBlur}
                    className={
                      checkInputhasErrorPagamento('mesVencimento')
                        ? 'error'
                        : ''
                    }
                  />
                  {'mesVencimento' in form.errors && form.submitCount > 0 && (
                    <S.ErroMensagem>
                      {getErrorMessagePagamento(
                        'mesVencimento',
                        form.errors.mesVencimento
                      )}
                    </S.ErroMensagem>
                  )}
                </S.FormularioItem>
                <S.FormularioItem>
                  <label htmlFor="anoVencimento">Ano de Vencimento</label>
                  <S.InputFormularioMaskData
                    id="anoVencimento"
                    name="anoVencimento"
                    maskChar={''}
                    mask="9999"
                    onChange={form.handleChange}
                    onBlur={form.handleBlur}
                    className={
                      checkInputhasErrorPagamento('anoVencimento')
                        ? 'error'
                        : ''
                    }
                  />
                  {'anoVencimento' in form.errors && form.submitCount > 0 && (
                    <S.ErroMensagem>
                      {getErrorMessagePagamento(
                        'anoVencimento',
                        form.errors.anoVencimento
                      )}
                    </S.ErroMensagem>
                  )}
                </S.FormularioItem>
              </S.DivMesmaLinha>
            </S.FormularioDados>
            <S.DivBotoes>
              <S.ButtonContainer type={'submit'}>
                Finalizar Pagamento
              </S.ButtonContainer>
              {checkGeneralError() && (
                <S.ErroMensagemGeral className={isLoading ? 'is-loading' : ''}>
                  Por favor, corrija os erros presentes no formulário
                </S.ErroMensagemGeral>
              )}
              {isLoading && (
                <S.ErroMensagemGeral className={'is-loading'}>
                  Finalizando compra...
                </S.ErroMensagemGeral>
              )}
              <S.ButtonContainer
                type="button"
                onClick={() => setTipoPagina('entrega')}
              >
                Voltar para a edição de endereço
              </S.ButtonContainer>
            </S.DivBotoes>
          </S.DivDados>
        </S.SuperForm>
      )}
    </>
  )
}

export default CartDados

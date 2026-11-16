param([string]$UrlApi = 'http://localhost:8080/api/v1')
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($env:AUTH_USERNAME) -or [string]::IsNullOrWhiteSpace($env:AUTH_PASSWORD)) {
    throw 'Exportá AUTH_USERNAME y AUTH_PASSWORD en esta terminal antes de ejecutar el recorrido.'
}
function SolicitarNivi([string]$Metodo, [string]$Ruta, $Cuerpo = $null) {
    $argumentos = @{ Method = $Metodo; Uri = "$($UrlApi.TrimEnd('/'))$Ruta"; Headers = $cabecerasNivi }
    if ($null -ne $Cuerpo) {
        $argumentos.ContentType = 'application/json; charset=utf-8'
        $argumentos.Body = [System.Text.Encoding]::UTF8.GetBytes(($Cuerpo | ConvertTo-Json -Depth 8 -Compress))
    }
    Invoke-RestMethod @argumentos
}
$cabecerasNivi = @{}
$sesionNivi = SolicitarNivi 'POST' '/acceso' @{ usuario = $env:AUTH_USERNAME; contrasena = $env:AUTH_PASSWORD }
$cabecerasNivi.Authorization = "Bearer $($sesionNivi.token)"
$libroNivi = $null
try {
    $altaNivi = @{ idOperacion = [guid]::NewGuid().ToString(); origen = 'MANUAL'; metadatos = @{ titulo = 'Demo local NIVI'; autores = @('Autora ficticia'); totalPaginas = 100 } }
    $creadoNivi = SolicitarNivi 'POST' '/libros' $altaNivi
    $libroNivi = $creadoNivi.libro
    $repetidoNivi = SolicitarNivi 'POST' '/libros' $altaNivi
    if ($repetidoNivi.libro.id -ne $libroNivi.id) { throw 'El reintento duplicó el libro.' }
    $rutaNivi = "/libros/$($libroNivi.id)"
    $libroNivi = SolicitarNivi 'PUT' "$rutaNivi/estado" @{ versionLibro = $libroNivi.version; estado = 'LEYENDO' }
    $avanceNivi = @{ idOperacion = [guid]::NewGuid().ToString(); versionLibro = $libroNivi.version; paginaActual = 35; nota = 'Recordar el comienzo del capítulo.' }
    $registroNivi = SolicitarNivi 'POST' "$rutaNivi/registros" $avanceNivi
    $libroNivi = $registroNivi.libro
    $reintentoNivi = SolicitarNivi 'POST' "$rutaNivi/registros" $avanceNivi
    if ($reintentoNivi.registro.id -ne $registroNivi.registro.id) { throw 'El reintento duplicó el registro.' }
    $detalleNivi = SolicitarNivi 'GET' $rutaNivi
    if ($detalleNivi.ultimoRegistro.nota -ne $avanceNivi.nota -or $detalleNivi.libro.porcentaje -ne 35) { throw 'No se recuperó el contexto del avance.' }
    $libroNivi = SolicitarNivi 'PUT' "$rutaNivi/estado" @{ versionLibro = $libroNivi.version; estado = 'PAUSADO' }
    $libroNivi = SolicitarNivi 'PUT' "$rutaNivi/estado" @{ versionLibro = $libroNivi.version; estado = 'LEYENDO' }
    $finalNivi = SolicitarNivi 'POST' "$rutaNivi/registros" @{ idOperacion = [guid]::NewGuid().ToString(); versionLibro = $libroNivi.version; paginaActual = 100 }
    $libroNivi = $finalNivi.libro
    if ($libroNivi.estado -ne 'TERMINADO' -or !$libroNivi.terminadoEn) { throw 'La finalización no fue atómica.' }
    $historialNivi = SolicitarNivi 'GET' "$rutaNivi/registros?pagina=1&tamano=20"
    if ($historialNivi.totalElementos -ne 2) { throw 'El historial tiene una cantidad inesperada.' }
    $null = SolicitarNivi 'DELETE' "$($rutaNivi)?version=$($libroNivi.version)"
    $libroNivi = $null
    Write-Output 'Recorrido aprobado: alta, reintentos, inicio, avance, contexto, pausa, retorno, finalización, historial y eliminación.'
} finally {
    if ($null -ne $libroNivi) {
        try {
            $actualNivi = SolicitarNivi 'GET' "/libros/$($libroNivi.id)"
            $null = SolicitarNivi 'DELETE' "/libros/$($libroNivi.id)?version=$($actualNivi.libro.version)"
        } catch { Write-Warning 'No se pudo limpiar el libro ficticio. Revisá la biblioteca.' }
    }
    $cabecerasNivi.Clear()
    $sesionNivi = $null
}

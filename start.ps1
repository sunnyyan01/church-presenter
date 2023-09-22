$Env:HOST = $(ipconfig | where {$_ -match 'IPv4'} | %{$_ -replace '^.+?([0-9.]+)$','$1'})
npm start
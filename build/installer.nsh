; Custom NSIS include for electron-builder
; - Prova a disinstallare una versione precedente (se presente) prima di procedere
; - NON cancella i backup (che stanno fuori da userData)

!macro customInit
  ; Cerca per DisplayName nelle chiavi Uninstall (per-user e per-machine)
  Push $0
  Push $1
  Push $2
  Push $3
  Push $4

  StrCpy $4 "Portale Commissioning"

  ; HKCU
  StrCpy $0 0
  loop_hkcu:
    EnumRegKey $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall" $0
    StrCmp $1 "" done_hkcu
    ReadRegStr $2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$1" "DisplayName"
    StrCmp $2 $4 found_hkcu
    IntOp $0 $0 + 1
    Goto loop_hkcu

  found_hkcu:
    ReadRegStr $3 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$1" "UninstallString"
    StrCmp $3 "" done_hkcu
    ExecWait '$3 /S'
    Goto done_hkcu

  done_hkcu:

  ; HKLM (64-bit)
  StrCpy $0 0
  loop_hklm:
    EnumRegKey $1 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall" $0
    StrCmp $1 "" done_hklm
    ReadRegStr $2 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$1" "DisplayName"
    StrCmp $2 $4 found_hklm
    IntOp $0 $0 + 1
    Goto loop_hklm

  found_hklm:
    ReadRegStr $3 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$1" "UninstallString"
    StrCmp $3 "" done_hklm
    ExecWait '$3 /S'
    Goto done_hklm

  done_hklm:

  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
!macroend

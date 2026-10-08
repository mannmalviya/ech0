Pod::Spec.new do |s|
  s.name           = 'AudioSplitter'
  s.version        = '1.0.0'
  s.summary        = 'Cuts long audio into parts for transcription'
  s.description    = 'Cuts long audio into parts that fit the limits of speech-to-text APIs'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end

// English.
//
// 판정 문구는 "OK to use" 같은 표현을 쓰지 않는다. 이 앱은 라벨에 적힌 규격이
// 서로 맞는지만 본다. 사용해도 된다는 승인이 아니다. 그래서 "SPECS MATCH"다.

import type { Messages } from './ko';

export const en: Messages = {
  'common.home': 'Home',
  'common.grinder': 'Grinder',
  'common.wheel': 'Wheel',
  'common.language': 'Language',

  'home.title': 'WheelMatch AI',
  'home.subtitle': 'Grinder and wheel specification check',
  'home.question': "Today's job?",
  'home.cutting': 'Cutting',
  'home.cuttingHint': 'Cut-off work',
  'home.grinding': 'Grinding',
  'home.grindingHint': 'Grinding and sanding',
  'home.afterChoice':
    'After you choose, photograph the grinder nameplate, then the wheel label.',
  'home.history': 'View inspection history →',

  'verdict.compatible': 'SPECS MATCH',
  'verdict.incompatible': 'SPECS DO NOT MATCH',
  'verdict.undetermined': 'CANNOT DETERMINE',
  'verdict.note.compatible':
    'The printed specifications match each other. Complete the safety checklist below.',
  'verdict.note.incompatible':
    'Do not use this combination. Check the reasons below.',
  'verdict.note.undetermined':
    'There is not enough information to decide. Take the photos again or enter the values yourself.',

  'result.title': 'Specification check result',
  'result.loading': 'Loading the result...',
  'result.undetermined.help':
    'Some values are missing or were read with low confidence. Take the photos again or enter the values yourself to get a judgement.',
  'result.retakeGrinder': 'Start again from the grinder',
  'result.retakeWheel': 'Check the wheel again',
  'result.save': 'Finish and save',
  'result.saving': 'Saving...',
  'result.saveError': 'Saving failed. Check your storage space and try again.',
  'result.saveErrorQuota':
    'This record was not saved — the device storage is full. Delete records you no longer need in history, or free up device storage, then try again.',
  'result.saveStopped': 'Save the stop result',

  'group.confirmed': 'Confirmed',
  'group.conflicting': 'Does not match',
  'group.unreadable': 'Could not read',
  'group.manual': 'Check these yourself',
  'notVerifiable.title': 'What this app cannot check',
  'notVerifiable.note':
    'These were not part of the result. They cannot be known from a photo and a label.',

  'checks.title': 'Results for each check',
  'rule.requiredValues': 'Required values',
  'rule.rpmSafety': 'Max operating speed',
  'rule.diameterFit': 'Diameter fit',
  'rule.purpose': 'Wheel use',
  'rule.workPurpose': 'Job match',
  'rule.wheelType': 'Wheel type',
  'rule.visibleDamage': 'Visible damage',
  'rule.unitConsistency': 'Label consistency',
  'rule.mountingSpec': 'Mounting bore',
  'rule.peripheralSpeed': 'Speed cross-check',
  'rule.expiry': 'Expiry date',
  'rule.confidence': 'Reading confidence',
  'expiry.source':
    'Expiry basis: only the month/year printed on the label is used. It is never calculated from the manufacturing date. The marking format follows oSa "Product marking requirements for bonded abrasives" (2020-04, based on EN 12413:2019). The EN 12413 text itself was not read. Treating the marked month as valid through its last day is this app\'s reading, not a regulation. Korea\'s Rules on Occupational Safety and Health Standards Article 122 has no expiry clause.',

  'evidence.toggleShow': 'Show evidence',
  'evidence.toggleHide': 'Hide evidence',
  'evidence.disclaimer':
    'This evidence is reference information, not a safety approval. "SPECS MATCH" only means the marked specs agree with each other.',
  'evidence.fields.title': 'Spec value evidence',
  'evidence.fields.note':
    'Shows what the AI read, the value after normalizing units, and the value the worker confirmed, side by side.',
  'evidence.fields.raw': 'OCR raw',
  'evidence.fields.normalized': 'Normalized',
  'evidence.fields.final': 'Final',
  'evidence.fields.source': 'Source',
  'evidence.source.ai': 'AI reading',
  'evidence.source.converted': 'AI conversion',
  'evidence.source.user': 'Worker entry',
  'evidence.notRecorded': 'Not recorded',
  'evidence.rules.title': 'Per-rule verdict evidence',
  'evidence.rules.formula': 'Formula',
  'evidence.rules.difference': 'Difference',
  'evidence.rules.gapPercent': 'Difference about {percent}%',
  'evidence.rules.expiryCompare': 'Expires {lastValid} / baseline {today}',
  'evidence.rules.doc': 'Source document',
  'evidence.rules.limit': 'Limits',
  'evidence.formula.rpmSafety':
    'Wheel max operating speed (rpm) ≥ grinder no-load speed (rpm)',
  'evidence.formula.diameterFit':
    'Wheel diameter (mm) ≤ grinder max wheel diameter (mm)',
  'evidence.formula.peripheralSpeed':
    'Peripheral speed (m/s) = π × diameter (m) × rpm ÷ 60',
  'evidence.formula.unitConsistency':
    "Converts the label's rpm marking to peripheral speed (m/s) and compares it with the label's m/s marking (10% tolerance)",
  'evidence.formula.expiry':
    'Compares the baseline date with the last day of the marked expiry month/year',
  'evidence.doc.requiredValues':
    "This app's design — a precondition for comparing speeds",
  'evidence.limit.requiredValues':
    'Not a regulatory basis. Both values must exist before the next comparison can be made.',
  'evidence.doc.rpmSafety':
    'Rules on Occupational Safety and Health Standards, Article 122(4) — do not exceed the marked maximum operating speed',
  'evidence.limit.rpmSafety':
    'Only compares the values printed on the grinder nameplate and the wheel label. It does not see actual wear or damage.',
  'evidence.doc.diameterFit':
    'Maximum wheel diameter printed on the grinder nameplate',
  'evidence.limit.diameterFit':
    'Compares the nameplate value as-is; it does not measure dimensions from a photo.',
  'evidence.doc.purpose': 'Label marking check — advisory only',
  'evidence.limit.purpose':
    "Does not affect the verdict. Whether it matches today's job is decided by Work purpose match.",
  'evidence.doc.workPurpose':
    'Rules on Occupational Safety and Health Standards, Article 122(5) — do not use a wheel on its side for a purpose it is not marked for',
  'evidence.limit.workPurpose':
    'Only compares the job the worker declared with the purpose printed on the label.',
  'evidence.doc.wheelType':
    "This app's design — the RPM/diameter rules assume a bonded abrasive wheel",
  'evidence.limit.wheelType':
    'UNDETERMINED here does not mean the wheel is dangerous — it means this app cannot judge this wheel type.',
  'evidence.doc.visibleDamage':
    'Only damage visible in the photo — advisory only',
  'evidence.limit.visibleDamage':
    'Hairline cracks are not visible in photos. Not seeing damage is never shown as "no damage." The standard check is the tap test.',
  'evidence.doc.unitConsistency':
    "Arithmetic check — whether the label's two markings agree",
  'evidence.limit.unitConsistency':
    'Not a safety limit. It is a 10% tolerance for catching OCR misreads.',
  'evidence.doc.mountingSpec':
    'Manufacturer guidance — Bosch Korea grinder safety campaign',
  'evidence.limit.mountingSpec':
    'The grinder nameplate has no spindle spec to compare against. Shown for reference only, not used in the verdict.',
  'evidence.doc.peripheralSpeed': 'Plausibility check — 15–110 m/s',
  'evidence.limit.peripheralSpeed':
    'Not a safety ceiling. An arithmetic check for catching values that are off by a digit.',
  'evidence.doc.expiry':
    'oSa "Product marking requirements for bonded abrasives" (2020-04, based on EN 12413:2019)',
  'evidence.limit.expiry':
    "Korean law has no expiry clause. Only compares the date printed on the label; never calculates from the manufacturing date. Treating the marked month as valid through its last day is this app's own reading.",
  'evidence.doc.confidence':
    "This app's design — low confidence never passes automatically",
  'evidence.limit.confidence':
    'The only way to resolve low confidence is for a person to confirm the value directly.',

  'ruleVersion.label': 'Ruleset version',
  'ruleVersion.note':
    'Where the rules used for this result come from, and what each covers. This is not a legal certification or a guarantee of regulatory compliance.',
  'ruleVersion.missing': 'Not recorded (inspection predates this feature)',
  'trialRun.title': 'Trial run',
  'trialRun.legalBasis':
    "Korea's Rules on Occupational Safety and Health Standards, Article 122(2), require a trial run of at least 1 minute before starting work and at least 3 minutes after replacing a wheel, checking the machine for anything abnormal. This app only times it and records your answer. It does not replace the procedure.",
  'trialRun.standClear':
    'During the trial run, stand clear of the wheel face and the direction of rotation.',
  'trialRun.separateFromTarget':
    'The trial run is timed separately from the 30-second pre-check target. Do not shorten the legally required time because of the target.',
  'trialRun.replacedQuestion': 'Did you just replace the wheel?',
  'trialRun.startReplaced': 'Yes — start the {seconds}s trial run',
  'trialRun.startBeforeWork': 'No — start the {seconds}s trial run',
  'trialRun.modeReplaced': 'Trial run after replacing the wheel',
  'trialRun.modeBeforeWork': 'Trial run before starting work',
  'trialRun.running': 'Running for at least {seconds}s. Time left',
  'trialRun.elapsed':
    'The required time has passed. Report anything abnormal below.',
  'trialRun.waitNotice': 'You can answer once the required time has passed.',
  'trialRun.findingsTitle': 'Was anything abnormal during the trial run?',
  'trialRun.findingsHint':
    'Tick everything that applies. If you tick any, you can only continue as Problem found.',
  'trialRun.finding.vibration': 'Abnormal vibration',
  'trialRun.finding.noise': 'Abnormal noise',
  'trialRun.finding.wobble': 'Wheel wobble',
  'trialRun.finding.wheelDamage': 'Signs of wheel damage or coming loose',
  'trialRun.finding.equipment': 'Something wrong with the machine',
  'trialRun.confirmNormal': 'Nothing abnormal — confirmed',
  'trialRun.reportAbnormal': 'Problem found',
  'trialRun.stopTitle': 'Do not start work',
  'trialRun.stopBody':
    'Something abnormal was found during the trial run. Stop the machine, disconnect the power, then inspect how the wheel is mounted and check the machine.',
  'trialRun.required':
    'The specification check is done. You can save after the trial run.',

  'grinderCondition.title': 'Check the grinder yourself',
  'grinderCondition.note':
    'Before fitting a wheel, look over the whole grinder and answer these five.',
  'grinderCondition.aiBoundary':
    'The AI only reads the specification data on the nameplate. The condition of the grinder and the safety of the work must be checked by the operator.',
  'grinderCondition.cordAndPlug': 'Is the power cord and plug undamaged?',
  'grinderCondition.cordAndPlugHint':
    'Run your hand along the whole cord — stripped insulation, crushed spots, a cracked plug',
  'grinderCondition.body': 'Is the body free of cracks and heavy damage?',
  'grinderCondition.bodyHint':
    'Drop marks, a split housing, parts that have worked loose',
  'grinderCondition.guard': 'Is the guard fitted and firmly locked?',
  'grinderCondition.guardHint':
    'It must not move when you twist it by hand, and it must cover the wheel at the required angle',
  'grinderCondition.auxiliaryHandle':
    'Is the side handle fitted and firmly tightened?',
  'grinderCondition.auxiliaryHandleHint':
    'You must be able to hold the tool with both hands against kickback. If it moves, pick Problem found',
  'grinderCondition.spindle':
    'Is the spindle, flange and lock nut free of visible damage?',
  'grinderCondition.spindleHint':
    'Stripped threads, a bent or dirty flange, a worn nut',
  'grinderCondition.confirmed': 'Checked',
  'grinderCondition.issue': 'Problem found',
  'grinderCondition.incomplete':
    'You must check the remaining {count} item(s) yourself before moving on to the wheel.',
  'grinderCondition.stopTitle': 'Do not use this grinder',
  'grinderCondition.stopBody':
    'A problem with the equipment has been found. Do not use it. Have it inspected and repaired, then check again.',

  'wheelCondition.title': 'Check the wheel yourself',
  'wheelCondition.note':
    'Before mounting, inspect the actual wheel on both sides, around the edge, and at the mounting area.',
  'wheelCondition.aiBoundary':
    'AI can only flag suspected visible damage. It never confirms that a wheel is undamaged or that the work is safe.',
  'wheelCondition.aiDamageWarning':
    'AI suspects a visible sign of damage in the photo. Inspect the wheel closely yourself.',
  'wheelCondition.labelWarning':
    'AI could not read enough label information. Check the actual label and correct the values above.',
  'wheelCondition.expiryWarning':
    'AI could not read the expiry date. Check the month/year printed on the label yourself.',
  'wheelCondition.damageFree':
    'Is it free from breaks, cracks, hairline cracks, and edge chips?',
  'wheelCondition.damageFreeHint':
    'Do not rely on the photo; rotate and inspect the whole wheel in good light',
  'wheelCondition.notDeformed': 'Is the wheel free from warping or distortion?',
  'wheelCondition.notDeformedHint':
    'Choose Issue found if it is not flat or shows twisting or swelling',
  'wheelCondition.mountingAreaUndamaged':
    'Is the centre hole and mounting area visibly undamaged?',
  'wheelCondition.mountingAreaUndamagedHint':
    'Check both sides around the centre hole for chips, wear, or distortion',
  'wheelCondition.labelLegible':
    'Can you identify the label and essential specifications?',
  'wheelCondition.labelLegibleHint':
    'Confirm that you can read the markings needed for comparison, including RPM, diameter, and use',
  'wheelCondition.expiryValid': 'Is the printed expiry date still valid?',
  'wheelCondition.expiryValidHint':
    'Read the printed month/year; do not estimate it from the manufacturing date',
  'wheelCondition.confirmed': 'Confirmed',
  'wheelCondition.issue': 'Issue found',
  'wheelCondition.incomplete':
    'You must personally check the remaining {count} items before comparing specifications.',
  'wheelCondition.stopTitle': 'DO NOT USE THIS WHEEL',
  'wheelCondition.stopBody':
    'A problem was found with the wheel. Do not mount it. Replace it with another serviceable wheel and inspect again.',

  'wheelType.bonded_abrasive': 'Standard bonded abrasive wheel',
  'wheelType.flap_disc': 'Flap disc',
  'wheelType.cup_wheel': 'Cup wheel',
  'wheelType.diamond': 'Diamond wheel',
  'wheelType.wire_brush': 'Wire brush',
  'wheelType.other': 'Other',
  'wheelType.unknown': 'Not sure',
  'wheelTypeConfirm.label': 'Wheel type',
  'wheelTypeConfirm.hint':
    'Choose by the shape of the wheel, not the label text. Look at the actual wheel.',
  'wheelTypeConfirm.aiSuggestion':
    'AI suggestion: {type} — only an initial guess from the photo.',
  'wheelTypeConfirm.supported':
    'Specifications are compared only when you confirm it is a standard bonded abrasive wheel.',
  'wheelTypeConfirm.unknown':
    'If the wheel type is not confirmed, the specification check ends as CANNOT DETERMINE. Look at the actual wheel and choose.',
  'wheelTypeConfirm.unsupported':
    'This app does not assess this type of wheel. The specification check ends as CANNOT DETERMINE. Follow the instructions from the manufacturer.',
  'wheelTypeConfirm.differs':
    'The AI suggestion ({ai}) and your choice ({selected}) differ. Check the actual wheel again and tick the manual confirmation below to continue.',
  'wheelTypeConfirm.needsConfirm':
    'The wheel type differs from the AI suggestion. Tick the manual confirmation to continue.',

  'action.title': 'DO NOT USE',
  'action.rpmSafety':
    'Do not mount this wheel. Replace it with one rated at or above the grinder speed.',
  'action.diameterFit':
    'Do not mount this wheel. Replace it with one no larger than the grinder allows.',
  'action.workPurpose':
    "Fit a wheel made for today's job instead. A wheel made for other work can break.",
  'action.expiry':
    'Do not mount this wheel. The expiry date on its label has passed. Replace it with one still within date.',
  'action.generic':
    'Do not mount this wheel. Replace it with one that meets the conditions.',

  'checklist.title': 'Safety checklist',
  'checklist.note': 'Check these yourself. The spec check does not cover them.',
  'checklist.ppe': 'PPE worn',
  'checklist.ppeHint': 'Check safety glasses, gloves and face shield',
  'checklist.workpiece': 'Workpiece is secured',
  'checklist.workpieceHint':
    'Held firmly in a vice or clamp. Never hold it with your hand or foot',
  'checklist.surroundings': 'People and flammables around you',
  'checklist.surroundingsHint':
    'Check that no one and nothing flammable is within reach of the sparks',
  'checklist.preWork':
    'Just before you start, check that sparks are not aimed at people or flammable material.',
  'checklist.incomplete':
    'You must confirm all {count} safety checklist items before saving.',

  'scan.retake': 'Retake photo',
  'scan.retryAnalysis': 'Analyse the same photo again',
  'scan.confirmTitle': 'Check the values that were read',
  'scan.grinder.title': 'Photograph the grinder nameplate',
  'scan.grinder.guide': 'Fit the nameplate inside the frame',
  'scan.grinder.analyzing': 'Reading the nameplate...',
  'scan.grinder.failed': 'Could not read the nameplate.',
  'scan.grinder.proceed': 'Confirm and photograph the wheel',
  'scan.wheel.title': 'Photograph the wheel label',
  'scan.wheel.guide': 'Fit the label inside the frame',
  'scan.wheel.analyzing': 'Reading the label...',
  'scan.wheel.failed': 'Could not read the label.',
  'scan.wheel.proceed': 'Confirm and compare specifications',
  'scan.wheel.grinderFirst': 'Check the grinder condition first.',

  'camera.starting': 'Opening the camera...',
  'camera.pickFromGallery': 'Choose from gallery',
  'camera.pickPhoto': 'Choose a photo from the gallery',
  'camera.retry': 'Try the camera again',
  'camera.gallery': 'Gallery',
  'camera.shutter': 'Take photo',
  'camera.error.unsupported':
    'This browser does not support the camera. Check that the page is opened over HTTPS.',
  'camera.error.permission':
    'Camera permission was denied. Allow the camera in your browser settings, then try again.',
  'camera.error.notFound': 'No usable camera was found.',
  'camera.error.inUse':
    'Another app is using the camera. Close that app and try again.',
  'camera.error.failed': 'Could not open the camera.',
  'camera.error.failedNamed': 'Could not open the camera. ({name})',

  'error.imageDecode':
    'This photo format could not be read. Choose a JPG or PNG instead. (iPhone HEIC photos may not be supported)',
  'error.network':
    'Could not reach the server. Check your network connection, then analyse the same photo again.',
  'error.serverConfig':
    'The label cannot be analysed because of a server setup problem. Tell your administrator.',
  'error.badRequest':
    'The analysis request was not valid. Take the photo again.',
  'error.imageTooLarge':
    'The image is too large. Try again with a lower-resolution photo.',
  'error.rateLimited':
    'There are too many requests. Wait a moment and try again.',
  'error.upstream':
    'The analysis service could not process the request. Wait a moment and try again. (error {status})',

  'field.model': 'Model',
  'field.noLoadRPM': 'No-load speed',
  'field.maxWheelDiameter': 'Max wheel diameter allowed',
  'field.maxRPM': 'Max operating speed',
  'field.diameter': 'Diameter',
  'field.thickness': 'Thickness',
  'field.purpose': 'Wheel use',
  'field.expiry': 'Expiry date',
  'field.wheelType': 'Wheel type',
  'field.placeholder': 'Not read — enter it yourself',
  'field.purposeUnknown': 'Not sure',
  'field.confidence.high': 'Reading confidence: high',
  'field.confidence.medium': 'Reading confidence: medium — check the values',
  'field.confidence.low':
    'Reading confidence: low — retake the photo or enter the values yourself',
  'field.rawShow': 'Show the text that was read',
  'field.rawHide': 'Hide the text that was read',
  'manualConfirm.label':
    'I checked the label myself and confirmed the values above',
  'manualConfirm.hint':
    'When ticked, the result uses the values you confirmed instead of the reading confidence.',

  'guide.grinder.model.hint':
    'The product name of the grinder. It is only recorded, not used for the result.',
  'guide.grinder.model.where':
    'Printed large at the top of the nameplate. Example: GWS 750-125',
  'guide.grinder.noLoadRPM.hint':
    'How fast this grinder spins. The wheel must withstand this speed.',
  'guide.grinder.noLoadRPM.where':
    'The number next to n₀ or "no load speed" on the nameplate. Example: 11000 r/min, 11000 min⁻¹',
  'guide.grinder.maxWheelDiameter.hint':
    'The largest wheel this machine can take. A larger wheel does not fit inside the safety guard.',
  'guide.grinder.maxWheelDiameter.where':
    'The diameter next to words like wheel or disc on the nameplate. Example: max Ø125mm',
  'guide.wheel.maxRPM.hint':
    'The highest speed this wheel can withstand. If it is lower than the grinder speed, the wheel can burst and fly apart.',
  'guide.wheel.maxRPM.where':
    'The speed printed large on the label. If only m/s is printed, the app converts it. Example: 12200 r/min, 80 m/s',
  'guide.wheel.diameter.hint':
    'The outside diameter of the wheel. It must not exceed what the grinder allows.',
  'guide.wheel.diameter.where':
    'The first number of the size marking. Example: 125 in 125 × 1.6 × 22.23',
  'guide.wheel.thickness.hint':
    'The thickness of the wheel. Cutting wheels are thin (1–3mm); grinding wheels are thick (about 6mm).',
  'guide.wheel.thickness.where':
    'The middle number of the size marking. Example: 1.6 in 125 × 1.6 × 22.23',
  'guide.wheel.purpose.hint':
    'Cutting wheels are for cutting, grinding wheels for grinding. Used for the wrong job, a wheel takes side loads and can break.',
  'guide.wheel.purpose.where':
    'The cutting/grinding marking on the label, printed as CUT-OFF, GRINDING or DEPRESSED CENTER.',
  'guide.wheel.expiry.hint':
    'The expiry date printed on the label. Manufacturers say not to use a wheel past this date. Some wheels have no expiry marking.',
  'guide.wheel.expiry.where':
    'Stamped as month/year on the metal ring in the centre. Example: 04/2023, sometimes after V or EXP. Do not enter the manufacturing date instead.',

  'requirement.compactTitle': 'Wheel needed',
  'requirement.compactUnknown':
    'The nameplate could not be read, so no conditions can be set',
  'requirement.title': 'Conditions for the wheel',
  'requirement.partial':
    'Not every condition could be set. Check the missing values on the nameplate yourself.',
  'requirement.notRecommendation':
    'This is not a product recommendation. These conditions follow from the values on the nameplate.',
  'requirement.purposeUnknown':
    'No job was chosen, so the wheel use cannot be set.',
  'requirement.diameterMax': 'Φ{diameter}mm or smaller',
  'requirement.diameterUnknown':
    'The max wheel diameter could not be read from the nameplate.',
  'requirement.rpmMin': '{rpm}rpm or higher',
  'requirement.rpmUnknown':
    'The no-load speed could not be read from the nameplate.',
  'summary.sizeClass': '{inch}-inch class (max Φ{diameter}mm)',
  'summary.maxDiameter': 'max Φ{diameter}mm',
  'summary.unreadable': 'The nameplate values could not be read',
  'margin.surplus': 'Margin +{percent}%',
  'margin.shortfall': 'Shortfall {percent}%',
  'margin.none': 'No margin (0%)',

  'wheelPurpose.cutting': 'Cutting wheel',
  'wheelPurpose.grinding': 'Grinding wheel',
  'wheelPurpose.unknown': 'Not identified',
  'wheelType.unconfirmed': 'Not confirmed',
  'confidence.high': 'High',
  'confidence.medium': 'Medium',
  'confidence.low': 'Low',
  'value.bore': 'Bore Φ{bore}mm',
  'value.unitConsistency': '{rpm}rpm = {computed}m/s / label {labeled}m/s',

  'reason.requiredValues.ok':
    'Both speeds needed for the comparison were read.',
  'reason.requiredValues.missingGrinder':
    'The grinder no-load speed could not be read. Retake the photo or enter the value yourself.',
  'reason.requiredValues.missingWheel':
    'The wheel max operating speed could not be read. Retake the photo or enter the value yourself.',
  'reason.requiredValues.missingBoth':
    'The grinder no-load speed and the wheel max operating speed could not be read. Retake the photos or enter the values yourself.',
  'reason.rpmSafety.missing':
    'A speed value is missing, so the speeds cannot be compared.',
  'reason.rpmSafety.fail':
    'The wheel max operating speed ({wheel}rpm) is lower than the grinder no-load speed ({grinder}rpm). The wheel can break and fly apart.',
  'reason.rpmSafety.pass':
    'The wheel max operating speed ({wheel}rpm) is at or above the grinder no-load speed ({grinder}rpm).',
  'reason.diameterFit.missing':
    'A diameter value is missing, so the diameters cannot be compared. Check the diameter on the grinder nameplate and the wheel label yourself.',
  'reason.diameterFit.fail':
    'The wheel diameter ({wheel}mm) is larger than the max diameter the grinder allows ({grinder}mm).',
  'reason.diameterFit.pass':
    'The wheel diameter ({wheel}mm) is within the max diameter the grinder allows ({grinder}mm).',
  'reason.purpose.unknown':
    'The wheel use (cutting/grinding) was not recognised. Check the label yourself.',
  'reason.purpose.recognized': 'Wheel use recognised: {purpose}.',
  'reason.workPurpose.unknown':
    "Today's job: {work}. The wheel use could not be read. Check the use marking on the label yourself.",
  'reason.workPurpose.mismatch':
    "Today's job: {work}. This wheel: {purpose}. A wheel made for a different job can break under side loads.",
  'reason.workPurpose.match': "Today's job ({work}) matches the wheel use.",
  'reason.wheelType.unknown':
    'The wheel type is not confirmed. Specifications are compared only for a confirmed standard bonded abrasive wheel. Look at the actual wheel and choose its type on the value check screen.',
  'reason.wheelType.unsupported':
    '{type}: this app does not handle this type of wheel. Its specification system is different, so no judgement can be made. Follow the manufacturer instructions.',
  'reason.wheelType.supported':
    'Confirmed as a standard bonded abrasive wheel, a type this app compares.',
  'reason.visibleDamage.suspected':
    'Part of the photo looks broken or cracked. Do not use this wheel; inspect it yourself.',
  'reason.visibleDamage.notVerifiable':
    'Hairline cracks cannot be seen in a photo. Do a ring test (tap it lightly and listen) before mounting.',
  'reason.confidence.low':
    'The label was read with low confidence. Retake the photo or enter the values yourself.',
  'reason.confidence.ok': 'The label was read with enough confidence.',
  'reason.unitConsistency.mismatch':
    'The speed in rpm and the peripheral speed in m/s on the label do not agree. One of them may have been misread. Check the numbers on the label again.',
  'reason.unitConsistency.match': 'The two speed markings on the label agree.',
  'reason.mountingSpec.missing':
    'The mounting bore (centre hole) could not be read from the label. Check that the wheel fits the spindle before mounting.',
  'reason.mountingSpec.shown':
    'The label gives a bore of Φ{bore}mm. The grinder nameplate does not show the spindle size, so this app cannot compare them. Check the fit on the spindle yourself.',
  'reason.peripheralSpeed.oddGrinder':
    'The edge speed calculated from the grinder values is outside the normal range. The diameter or speed may have been misread. Check the grinder numbers again.',
  'reason.peripheralSpeed.oddWheel':
    'The edge speed calculated from the wheel values is outside the normal range. The diameter or speed may have been misread. Check the wheel label numbers again.',
  'reason.peripheralSpeed.oddBoth':
    'The edge speeds calculated from the grinder and wheel values are outside the normal range. The diameter or speed may have been misread. Check the grinder and wheel numbers again.',
  'reason.peripheralSpeed.ok':
    'The diameter and speed values are consistent with each other.',
  'reason.expiry.noToday':
    'There is no reference date, so the expiry date cannot be checked. Reopen the app and run the inspection again.',
  'reason.expiry.unreadable':
    'The expiry date could not be read from the label. Reference date {today}. Check the month/year marking on the metal ring yourself (example: 04/2023). Some wheels have no marking.',
  'reason.expiry.expired':
    'The expiry date on the label has passed. Marked {expiry} (valid through {lastValid}), reference date {today}. Manufacturers say not to use a wheel past its expiry date.',
  'reason.expiry.valid':
    'The expiry date on the label has not passed. Marked {expiry} (valid through {lastValid}), reference date {today}.',

  'ruleSource.krOsh.label':
    "Korea's Rules on Occupational Safety and Health Standards",
  'ruleSource.krOsh.reference':
    'Article 122 (Ministry of Employment and Labor Ordinance No. 450, effective 2026-03-02)',
  'ruleSource.krOsh.scope': 'Max operating speed, side use, guard, trial run',
  'ruleSource.kosha.label': 'KOSHA GUIDE',
  'ruleSource.kosha.reference':
    'M-189-2015 Technical guideline on safe work with portable grinders',
  'ruleSource.kosha.scope': 'Storage and handling advice (not legally binding)',
  'ruleSource.osa.label': 'oSa Product marking requirements',
  'ruleSource.osa.reference': 'Issue 2, 2020-04 (based on EN 12413:2019)',
  'ruleSource.osa.scope':
    'Reference for the expiry marking format. The EN text itself was not read',

  'hazard.list.cutting': 'Cutting hazards',
  'hazard.list.grinding': 'Grinding hazards',
  'hazard.list.common': 'General hazards',
  'hazard.summary': '{title} ({count})',
  'hazard.cuttingSide.title': 'Do not grind with the side of a cutting wheel',
  'hazard.cuttingSide.detail':
    'Cutting wheels are made to cut with their edge only. Pushed sideways, the thin wheel cannot take the side load and breaks.',
  'hazard.cuttingPinch.title': 'Do not twist or bend the wheel',
  'hazard.cuttingPinch.detail':
    'If the cut closes, it pinches the wheel and causes kickback. Support the material on both sides so the cut opens as you go.',
  'hazard.cuttingForce.title': 'Do not force the cut',
  'hazard.cuttingForce.detail':
    'Forcing it overheats and warps the wheel. Let the weight of the tool feed it in slowly.',
  'hazard.grindingAngle.title': 'Hold the wheel at 15–30°',
  'hazard.grindingAngle.detail':
    'Held too upright, the wheel edge digs into the material and the tool jumps. A flatter angle spreads the contact and keeps it stable.',
  'hazard.grindingSide.title': 'Do not side-load a grinding wheel either',
  'hazard.grindingSide.detail':
    'Only cup wheels are made to be used on their side. Pushing an ordinary grinding wheel sideways can break it.',
  'hazard.grindingIdle.title': 'Run a newly fitted wheel without load first',
  'hazard.grindingIdle.detail':
    'A bad fit or a crack shows up before any load is applied. Point it where no one is standing and check for abnormal vibration or noise.',
  'hazard.commonStop.title':
    'Put the tool down only after it has fully stopped',
  'hazard.commonStop.detail':
    'The wheel keeps spinning after the power is off. If it touches the floor while spinning, the tool jumps.',
  'hazard.commonGuard.title': 'Set the guard to face away from you',
  'hazard.commonGuard.detail':
    'The safety guard blocks the side fragments fly towards. If it is turned the wrong way, your body is exposed even with the guard fitted.',

  'notVerifiable.internalCrack.title': 'Internal cracks',
  'notVerifiable.internalCrack.detail':
    'Hairline cracks do not show in a surface photo. Do a ring test (tap it lightly and listen) before mounting.',
  'notVerifiable.physicalDamage.title': 'Physical damage',
  'notVerifiable.physicalDamage.detail':
    'A photo only shows obvious breakage. Dents, distortion and dampness cannot be detected. Inspect it yourself.',
  'notVerifiable.mounting.title': 'Correct mounting',
  'notVerifiable.mounting.detail':
    'Flange tightness, direction of rotation and seating on the spindle cannot be seen in a photo. Check them yourself after mounting.',
  'notVerifiable.guard.title': 'Safety guard condition',
  'notVerifiable.guard.detail':
    'This app cannot see whether the guard is fitted, set at the right angle, or undamaged. Check it with your own eyes.',

  'history.title': 'Inspection history',
  'history.loading': 'Loading records...',
  'history.clearConfirm':
    'All {count} saved inspection records will be deleted. This cannot be undone.',
  'history.clearConfirmButton': 'Delete all',
  'history.cancel': 'Cancel',
  'history.clearAll': 'Delete all records',
  'history.newInspection': 'Start a new inspection',
  'history.empty': 'No inspection records saved.',
  'history.timeNote':
    'The "30 seconds" is the target for the pre-check only: from choosing the job until just before the trial run starts. The legally required trial run (at least 1 or 3 minutes) is separate from this target and is never shortened.',
  'history.elapsed': 'Inspection took {time}',
  'history.elapsedWithTrial':
    'Inspection took {time} (including the trial run)',
  'history.preTrial': 'Pre-check {time} (until the trial run)',
  'history.unknownModel': 'Unknown model',
  'history.unknownDiameter': 'Unknown diameter',
  'history.summary': '{model} {grinderRpm} · wheel {wheelDiameter} {wheelRpm}',
  'history.grinderPhoto': 'Grinder nameplate',
  'history.wheelPhoto': 'Wheel label',
  'history.noPhoto': 'No photos saved.',
  'history.loadMore': 'Show more ({shown}/{total})',
  'history.filter.title': 'Filters',
  'history.filter.reset': 'Reset filters',
  'history.filter.purpose': 'Job',
  'history.filter.purposeAll': 'All',
  'history.filter.verdict': 'Verdict',
  'history.filter.verdictAll': 'All',
  'history.filter.wheelType': 'Wheel type',
  'history.filter.wheelTypeAll': 'All',
  'history.filter.trialRun': 'Trial run result',
  'history.filter.trialRunAll': 'All',
  'history.filter.trialRunNormal': 'No issues',
  'history.filter.trialRunAbnormal': 'Issue found',
  'history.filter.trialRunNone': 'No trial run',
  'history.filter.dateFrom': 'From',
  'history.filter.dateTo': 'To',
  'history.filter.resultCount': '{count} records',
  'history.filter.resultCountOf': '{count} of {total} records',
  'history.filter.noResults': 'No records match these filters.',
  'elapsed.overHour': 'over 1 hour',
  'elapsed.seconds': '{seconds} s',
  'elapsed.minutes': '{minutes} min',
  'elapsed.minutesSeconds': '{minutes} min {seconds} s',

  'research.notice':
    'Validation/research feature. It does not change on-site results.',
  'research.noticeDetail':
    'Visible only in validation builds. It only exports records and calculates metrics; it plays no part in results, condition checks, the trial run or save conditions.',
  'research.modeTitle': 'Research mode',
  'research.modeHint':
    'Exports measurements as CSV. Not needed for on-site use.',
  'research.download': 'Download CSV ({count} records)',
  'research.deviceOnly':
    'Records exist only on this device. Move the downloaded file yourself.',
  'research.exported': 'Exported all {count} records to CSV.',
  'research.downloadFailed': 'Download failed. Check your storage space.',
  'research.truthTitle': 'Ground truth file',
  'research.truthHint':
    'Values you read and wrote down yourself before taking the photos. They are required to calculate metrics. The app never creates ground truth.',
  'research.truthEmpty':
    'No ground truth entries were read. Check that the file is a JSON array.',
  'research.truthUnreadable': 'The ground truth file could not be read.',
  'research.truthRejected':
    '{count} line(s) were excluded because of their format. Check the sample size.',
  'metrics.title': 'Evaluation metrics',
  'metrics.note':
    'Calculated from {count} record(s) with ground truth. Reading accuracy uses the original OCR values before any user correction.',
  'metrics.notAvailable': 'N/A — no data to calculate',
  'metrics.records': '{numerator} / {denominator} records',
  'metrics.fields': '{numerator} / {denominator} fields',
  'metrics.falseSafe.name': 'False-Safe Rate',
  'metrics.falseSafe.definition':
    'Of the records whose ground truth is SPECS DO NOT MATCH, the share the app reported as SPECS MATCH. If it is not zero, do not release.',
  'metrics.undetermined.name': 'Undetermined rate',
  'metrics.undetermined.definition':
    'The share of results that could not be determined. This is designed behaviour, not a failure.',
  'metrics.fieldAccuracy.name': 'Field extraction accuracy',
  'metrics.fieldAccuracy.definition':
    'Of the fields with ground truth, the share where the original OCR value matched.',
  'metrics.unitNormalization.name': 'Unit normalisation errors',
  'metrics.unitNormalization.definition':
    'Of the records converted from m/s, the share whose result differs from the ground truth.',
  'metrics.falseSafeIds':
    'False-safe record ids: {ids} — analyse and report each one. Do not hide them.',

  // Validation build banner. Rendered under the same condition as the research tools.
  // Display only — it never affects verdicts or saved records.
  'validationBuild.label': 'Validation build',
  'validationBuild.note':
    'Not for field use. Records are kept separately from the field build.',
  'validationBuild.commit': 'commit {sha}',
  'validationBuild.commitUnknown': 'no commit info',

  // Build info. Shown on both builds, next to the disclaimer.
  'build.commit': 'build {sha}',
  'build.commitUnknown': 'no build info',

  // Service worker update notice. Shown at the top of the screen when detected.
  // The apply button is locked during an inspection or trial run — the screen
  // must not change without warning while the machine is actually running.
  'update.available': 'A new version is available.',
  'update.apply': 'Update now',
  'update.applying': 'Applying update...',
  'update.blockedDuringInspection':
    'You can update once the inspection is finished.',

  'meta.title': 'WheelMatch AI — Grinder and wheel specification check',

  disclaimer:
    'This app only compares the specifications printed on the labels. It does not guarantee work safety and does not replace the manufacturer manual or your site safety rules.',

  'translation.notice':
    'This translation has not been reviewed yet. If the meaning is unclear, follow the Korean text and ask your supervisor.',
};
